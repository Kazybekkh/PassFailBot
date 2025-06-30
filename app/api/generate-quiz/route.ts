import { streamText } from "ai" // Changed from generateText
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

function jsonError(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/* -------------------------------------------------------------------------- */
/*  HELPERS                                                                   */
/* -------------------------------------------------------------------------- */

function extractJson(raw: string): any | null {
  // Grab the first {...} block in the text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/*  ROUTE                                                                     */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    /* 1. Parse multipart form -------------------------------------------- */
    const form = await req.formData()
    const file = form.get("file") as File | null
    const style = form.get("style") as "strict" | "similar" | null

    if (!file) return jsonError("No file uploaded.")
    if (!style) return jsonError("Quiz style missing.")
    if (file.size > MAX_FILE_BYTES) return jsonError("PDF exceeds 8 MB.", 413)

    /* 2. Select provider -------------------------------------------------- */
    const ak = process.env.ANTHROPIC_API_KEY
    const ok = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (!ak && !ok) return jsonError("No AI provider key configured.", 500)

    const promptStrict =
      "Return ONLY valid minified JSON, no markdown, matching this TypeScript type:\n" +
      "{ questions: { question: string; options: string[4]; answer: string }[] }\n" +
      "Generate 10 multiple-choice questions strictly from the PDF content."

    const promptSimilar =
      "Return ONLY valid minified JSON, no markdown, matching this TypeScript type:\n" +
      "{ questions: { question: string; options: string[4]; answer: string }[] }\n" +
      "Invent 10 new multiple-choice questions on the same topic and difficulty as the PDF."

    const prompt = style === "strict" ? promptStrict : promptSimilar

    /* 3. Build model + messages ------------------------------------------ */
    let model
    let messages

    if (ak) {
      model = createAnthropic({ apiKey: ak })("claude-3-5-sonnet-20240620")
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
      model = openai("gpt-4o", { apiKey: ok! })
      messages = [
        {
          role: "user",
          content: `The PDF filename is "${file.name}". ${prompt} (You cannot read the PDF, so invent plausible questions.)`,
        },
      ]
    }

    /* 4. Call the model using streamText ---------------------------------- */
    const { textStream } = await streamText({ model, messages })
    let fullText = ""
    for await (const delta of textStream) {
      fullText += delta
    }

    /* 5. Tolerant JSON parsing & validation ------------------------------- */
    const raw = fullText.trim()
    const parsed = extractJson(raw)
    const quiz = QUIZ_SCHEMA.safeParse(parsed)

    if (!quiz.success) {
      console.warn("AI returned unparsable quiz. Falling back.")
      return Response.json({
        fallback: true,
        error: "Invalid JSON returned from model.",
        quiz: FALLBACK_QUIZ,
      })
    }

    return Response.json(quiz.data)
  } catch (err) {
    console.error("generate-quiz fatal error:", err)
    return Response.json({
      fallback: true,
      error: err instanceof Error ? err.message : "Unknown server error",
      quiz: FALLBACK_QUIZ,
    })
  }
}
