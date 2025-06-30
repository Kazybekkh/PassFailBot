import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, APIError } from "ai"
import { z } from "zod"

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
if (!OPENAI_KEY) {
  throw new Error("NEXT_PUBLIC_OPENAI_API_KEY is missing – add it in your Vercel / .env project settings.")
}

const openai = createOpenAI({ apiKey: OPENAI_KEY })
export const maxDuration = 60 // seconds for Next-lite timeout
const MAX_FILE_BYTES = 8_000_000

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const quizStyle = formData.get("style") as "strict" | "similar" | null

    if (!file) return jsonError("No file uploaded", 400)
    if (!quizStyle) return jsonError("Quiz style missing", 400)
    if (file.size > MAX_FILE_BYTES) return jsonError("PDF larger than 8 MB – upload a smaller file.", 413)

    const strictPrompt =
      "Based on this PDF, generate a challenging 10-question multiple-choice quiz. For each question give 4 options and specify the correct answer."
    const similarPrompt =
      "Study this PDF’s style and difficulty. Create a *new* 10-question multiple-choice quiz of similar difficulty (do not copy). If math appears, use plain-text math (no LaTeX). Provide 4 options per question and mark the correct one."
    const promptText = quizStyle === "similar" ? similarPrompt : strictPrompt

    const { object: quiz } = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        questions: z
          .array(
            z.object({
              question: z.string(),
              options: z.array(z.string()).length(4),
              answer: z.string(),
            }),
          )
          .min(5)
          .max(15),
      }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "file",
              data: await file.arrayBuffer(),
              mimeType: "application/pdf",
              filename: file.name,
            },
          ],
        },
      ],
    })

    return Response.json(quiz)
  } catch (err) {
    console.error("generate-quiz:", err)

    // Custom handling for common failure modes
    let status = apiStatus(err)
    let message = apiMessage(err)

    if (message.includes("timed out")) {
      status = 504
      message = "OpenAI request timed out – the PDF may be too large or complex. Try a smaller file."
    }

    return jsonError(message, status)
  }
}

/* helpers ------------------------------------------------------------------*/

function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function apiStatus(err: unknown) {
  return err instanceof APIError ? err.status : 500
}

function apiMessage(err: unknown) {
  if (err instanceof APIError) return err.message
  if (err instanceof Error) return err.message
  return "Unknown server error"
}
