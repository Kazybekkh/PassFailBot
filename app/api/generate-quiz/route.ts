import { generateObject, APIError } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export const maxDuration = 60
const MAX_FILE_BYTES = 8_000_000

function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().describe("The question text."),
        options: z.array(z.string()).length(4).describe("An array of 4 possible answers."),
        answer: z.string().describe("The correct answer, which must be one of the options."),
      }),
    )
    .min(8)
    .max(12)
    .describe("An array of 8 to 12 questions for the quiz."),
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const quizStyle = formData.get("style") as "strict" | "similar" | null

    if (!file) return jsonError("No file uploaded.", 400)
    if (!quizStyle) return jsonError("Quiz style is missing.", 400)
    if (file.size > MAX_FILE_BYTES) return jsonError("PDF is larger than 8 MB.", 413)

    const promptText =
      quizStyle === "strict"
        ? "Based *strictly* on the text in this PDF, generate a challenging quiz of 10 multiple-choice questions. For each question, provide 4 options and specify the correct answer. The questions must be answerable using only the provided document."
        : "Analyze the style, topics, and difficulty of the provided PDF. Then, create a *new* quiz of 10 multiple-choice questions on the same topics and of similar difficulty. Do not copy questions directly from the document. Provide 4 options per question and specify the correct answer."

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
    if (ANTHROPIC_KEY) {
      console.log("[/api/generate-quiz] Using Anthropic.")
      const anthropic = createAnthropic({ apiKey: ANTHROPIC_KEY })
      const fileBuffer = await file.arrayBuffer()
      const { object: quiz } = await generateObject({
        model: anthropic("claude-3-5-sonnet-20240620"),
        schema: quizSchema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              { type: "file", data: fileBuffer, mimeType: "application/pdf", filename: file.name },
            ],
          },
        ],
      })
      console.log("[/api/generate-quiz] Anthropic generation successful.")
      return Response.json(quiz)
    }

    const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (OPENAI_KEY) {
      console.log("[/api/generate-quiz] Using OpenAI fallback.")
      const { object: quiz } = await generateObject({
        model: openai("gpt-4o", { apiKey: OPENAI_KEY }),
        schema: quizSchema,
        messages: [
          {
            role: "user",
            content: `The PDF is titled "${file.name}". ${promptText} You cannot see the PDF, so instead invent 10 insightful multiple-choice questions a diligent university student might be asked after reading it. Provide 4 options and mark the answer.`,
          },
        ],
      })
      console.log("[/api/generate-quiz] OpenAI generation successful.")
      return Response.json(quiz)
    }

    return jsonError("No AI provider is configured.", 500)
  } catch (err) {
    console.error("--- DETAILED ERROR in /api/generate-quiz ---")
    console.error(err) // Log the raw error

    if (err instanceof APIError) {
      return jsonError(`AI API Error: ${err.message}`, err.status)
    }
    if (err instanceof Error) {
      return jsonError(err.message, 500)
    }
    return jsonError("An unknown error occurred.", 500)
  }
}
