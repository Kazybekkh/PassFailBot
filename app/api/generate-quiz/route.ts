import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

/* -------------------------------------------------------------------------- */
/*  CONFIG                                                                    */
/* -------------------------------------------------------------------------- */

const MAX_FILE_BYTES = 8_000_000

const QUIZ_SCHEMA = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        answer: z.string(),
      }),
    )
    .min(8)
    .max(12),
})

const FALLBACK_QUIZ = {
  questions: [
    {
      question: "Fallback question: 2 + 2 = ?",
      options: ["1", "2", "3", "4"],
      answer: "4",
    },
  ],
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/* -------------------------------------------------------------------------- */
/*  HELPERS                                                                   */
/* -------------------------------------------------------------------------- */

async function generateWithProvider({
  provider,
  file,
  style,
}: {
  provider: "anthropic" | "openai"
  file: File
  style: "strict" | "similar"
}) {
  const promptStrict = "Generate 10 multiple-choice questions strictly from the provided PDF content."
  const promptSimilar = "Invent 10 new multiple-choice questions on the same topic and difficulty as the provided PDF."
  const prompt = style === "strict" ? promptStrict : promptSimilar

  let model: ReturnType<typeof openai | typeof createAnthropic>
  let messages: any

  if (provider === "anthropic") {
    model = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })("claude-3-5-sonnet-20240620")

    messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "file",
            data: await file.arrayBuffer(),
            mimeType: "application/pdf",
            filename: file.name,
          },
        ],
      },
    ]
  } else {
    // openai fallback (cannot see the PDF, so rely on filename)
    model = openai("gpt-4o", {
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
    })

    messages = [
      {
        role: "user",
        content: `The PDF filename is "${file.name}". ${prompt} (You cannot read the PDF, so invent plausible questions).`,
      },
    ]
  }

  const { object } = await generateObject({
    model,
    schema: QUIZ_SCHEMA,
    messages,
  })

  return object
}

/* -------------------------------------------------------------------------- */
/*  ROUTE                                                                     */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    /* 1. Parse multipart form ------------------------------------------ */
    const form = await req.formData()
    const file = form.get("file") as File | null
    const style = form.get("style") as "strict" | "similar" | null

    if (!file) return jsonError("No file uploaded.")
    if (!style) return jsonError("Quiz style missing.")
    if (file.size > MAX_FILE_BYTES) return jsonError("PDF exceeds 8 MB.", 413)

    /* 2. Determine which providers are available ----------------------- */
    const providers: Array<"anthropic" | "openai"> = []
    if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic")
    if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) providers.push("openai")
    if (!providers.length) return jsonError("No AI provider key configured.", 500)

    /* 3. Try providers in order ---------------------------------------- */
    let lastError: unknown = null
    for (const provider of providers) {
      try {
        const quiz = await generateWithProvider({ provider, file, style })
        return Response.json(quiz)
      } catch (err) {
        lastError = err
        console.error(`${provider} provider failed:`, err)
        // If Anthropic overloaded, continue to OpenAI. Otherwise loop proceeds naturally.
      }
    }

    /* 4. Both providers failed – graceful fallback --------------------- */
    const errorMessage = lastError instanceof Error ? lastError.message : "Unknown error"
    return Response.json({
      fallback: true,
      error: errorMessage,
      quiz: FALLBACK_QUIZ,
    })
  } catch (err) {
    /* 5. Catastrophic / unexpected error ------------------------------- */
    console.error("generate-quiz fatal error:", err)
    return Response.json({
      fallback: true,
      error: err instanceof Error ? err.message : "Unknown server error",
      quiz: FALLBACK_QUIZ,
    })
  }
}
