import { createAnthropic } from "@ai-sdk/anthropic"
import { generateObject, APIError } from "ai"
import { z } from "zod"

export const maxDuration = 60 // Vercel timeout
const MAX_FILE_BYTES = 8_000_000 // 8 MB

// Helper to create a JSON error response
function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function POST(req: Request) {
  try {
    // 1. Validate API Key
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_KEY) {
      return jsonError("Anthropic API key not configured.", 500)
    }
    const anthropic = createAnthropic({ apiKey: ANTHROPIC_KEY })

    // 2. Validate Request Body
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const quizStyle = formData.get("style") as "strict" | "similar" | null

    if (!file) return jsonError("No file uploaded.", 400)
    if (!quizStyle) return jsonError("Quiz style is missing.", 400)
    if (file.size > MAX_FILE_BYTES) return jsonError("PDF is larger than 8 MB. Please upload a smaller file.", 413)

    // 3. Define prompt based on quiz style
    const promptText =
      quizStyle === "strict"
        ? "Based *strictly* on the text in this PDF, generate a challenging quiz of 10 multiple-choice questions. For each question, provide 4 options and specify the correct answer. The questions must be answerable using only the provided document."
        : "Analyze the style, topics, and difficulty of the provided PDF. Then, create a *new* quiz of 10 multiple-choice questions on the same topics and of similar difficulty. Do not copy questions directly from the document. Provide 4 options per question and specify the correct answer."

    // 4. Call AI to generate the quiz object
    const { object: quiz } = await generateObject({
      model: anthropic("claude-3-5-sonnet-20240620"),
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
    // 5. Handle errors gracefully
    console.error("[/api/generate-quiz] Error:", err)

    if (err instanceof APIError) {
      // Handle specific API errors from the AI SDK
      if (err.message.includes("timed out")) {
        return jsonError(
          "The request timed out. Your PDF might be too large or complex. Please try a smaller file.",
          504,
        )
      }
      return jsonError(`Anthropic API Error: ${err.message}`, err.status)
    } else if (err instanceof Error) {
      // Handle generic JavaScript errors
      return jsonError(err.message, 500)
    }

    // Fallback for unknown errors
    return jsonError("An unknown error occurred while generating the quiz.", 500)
  }
}
