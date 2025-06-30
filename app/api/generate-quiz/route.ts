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

export async function POST(req: Request) {
  console.log("[/api/generate-quiz] Received request.")
  try {
    // 1. Pick a provider
    let modelFn: Parameters<typeof generateObject>[0]["model"]

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
    if (ANTHROPIC_KEY) {
      const anthropic = createAnthropic({ apiKey: ANTHROPIC_KEY })
      modelFn = anthropic("claude-3-5-sonnet-20240620")
      console.log("[/api/generate-quiz] Using Anthropic.")
    } else {
      const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
      if (!OPENAI_KEY) {
        return jsonError("No AI provider is configured.", 500)
      }
      // Pass the key explicitly – the SDK otherwise looks for OPENAI_API_KEY
      modelFn = openai("gpt-4o", { apiKey: OPENAI_KEY })
      console.log("[/api/generate-quiz] Using OpenAI fallback.")
    }

    // 2. Validate Request Body
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const quizStyle = formData.get("style") as "strict" | "similar" | null
    console.log(`[/api/generate-quiz] File: ${file?.name}, Style: ${quizStyle}`)

    if (!file) return jsonError("No file uploaded.", 400)
    if (!quizStyle) return jsonError("Quiz style is missing.", 400)
    if (file.size > MAX_FILE_BYTES) return jsonError("PDF is larger than 8 MB.", 413)

    // 3. Define prompt
    const promptText =
      quizStyle === "strict"
        ? "Based *strictly* on the text in this PDF, generate a challenging quiz of 10 multiple-choice questions. For each question, provide 4 options and specify the correct answer. The questions must be answerable using only the provided document."
        : "Analyze the style, topics, and difficulty of the provided PDF. Then, create a *new* quiz of 10 multiple-choice questions on the same topics and of similar difficulty. Do not copy questions directly from the document. Provide 4 options per question and specify the correct answer."

    console.log("[/api/generate-quiz] Calling generateObject...")
    const fileBuffer = await file.arrayBuffer()
    console.log(`[/api/generate-quiz] File buffer created, size: ${fileBuffer.byteLength}`)

    // 4. Call AI
    const { object: quiz } = await generateObject({
      model: modelFn,
      schema: z.object({
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
      }),
      messages: ANTHROPIC_KEY
        ? [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "file",
                  data: fileBuffer,
                  mimeType: "application/pdf",
                  filename: file.name,
                },
              ],
            },
          ]
        : [
            {
              role: "user",
              content: `The PDF is titled "${file.name}". ${promptText}
You cannot see the PDF, so instead invent 10 insightful multiple-choice questions a diligent
university student might be asked after reading it. Provide 4 options and mark the answer.`,
            },
          ],
    })
    console.log("[/api/generate-quiz] generateObject successful.")

    return Response.json(quiz)
  } catch (err) {
    console.error("--- DETAILED ERROR in /api/generate-quiz ---")
    console.error("Error Type:", typeof err)
    console.error("Error:", err?.message || err)

    if (err instanceof APIError) {
      console.error("Caught APIError. Status:", err.status, "Message:", err.message)
      if (err.message.includes("timed out")) {
        return jsonError(
          "The request timed out. Your PDF might be too large or complex. Please try a smaller file.",
          504,
        )
      }
      return jsonError(`Anthropic API Error: ${err.message}`, err.status)
    } else if (err instanceof Error) {
      console.error("Caught generic Error. Message:", err.message, "Stack:", err.stack)
      return jsonError(err.message, 500)
    }

    console.error("Caught unknown error type.")
    return jsonError("An unknown error occurred while generating the quiz.", 500)
  }
}
