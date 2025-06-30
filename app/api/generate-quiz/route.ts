import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, APIError } from "ai"
import { z } from "zod"

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
if (!OPENAI_KEY) throw new Error("NEXT_PUBLIC_OPENAI_API_KEY is missing. Add it in your project settings.")

const openai = createOpenAI({ apiKey: OPENAI_KEY })

export const maxDuration = 60
const MAX_FILE_BYTES = 8_000_000

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const quizStyle = formData.get("style") as "strict" | "similar"

    if (!file)
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })

    if (file.size > MAX_FILE_BYTES)
      return new Response(JSON.stringify({ error: "PDF larger than 8 MB – please upload a smaller file." }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      })

    const strictPrompt =
      "Based on this PDF, generate a challenging 10-question multiple-choice quiz. For each question give 4 options and specify the correct answer."
    const similarPrompt =
      "Analyze the style and difficulty of this PDF. Create a new 10-question multiple-choice quiz that is similar in style (not copied). If the source contained math, write plain-text math (no LaTeX). Provide 4 options per question and specify the correct answer."
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
          .length(10),
      }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "file", data: await file.arrayBuffer(), mimeType: "application/pdf", filename: file.name },
          ],
        },
      ],
    })

    return Response.json(quiz)
  } catch (err) {
    console.error("generate-quiz:", err)
    let status = err instanceof APIError ? err.status : 500
    let message = err instanceof APIError ? err.message : err instanceof Error ? err.message : "Unknown server error."

    if (message.includes("timed out")) {
      status = 504
      message = "OpenAI request timed out – the PDF may be too large or complex. Try a simpler or smaller file."
    }

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }
}
