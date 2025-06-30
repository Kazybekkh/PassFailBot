import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export const maxDuration = 60
const MAX_FILE_BYTES = 8_000_000

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        answer: z.string(),
      }),
    )
    .min(1),
})

export async function POST(req: Request) {
  try {
    /* ────── 1. Parse incoming form ────── */
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const quizStyle = formData.get("style") as "strict" | "similar" | null

    if (!file) throw new Error("No file uploaded.")
    if (!quizStyle) throw new Error("Quiz style is missing.")
    if (file.size > MAX_FILE_BYTES) throw new Error("PDF exceeds 8 MB.")

    /* ────── 2. Choose model ────── */
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    let model: Parameters<typeof generateObject>[0]["model"]
    let messages: Parameters<typeof generateObject>[0]["messages"]

    const prompt =
      quizStyle === "strict"
        ? "Create 10 multiple-choice questions strictly from this PDF (4 options each, mark the answer)."
        : "Create 10 new multiple-choice questions in a similar style/topic (4 options each, mark the answer)."

    if (anthropicKey) {
      model = createAnthropic({ apiKey: anthropicKey })("claude-3-5-sonnet-20240620")
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "file", data: await file.arrayBuffer(), mimeType: "application/pdf", filename: file.name },
          ],
        },
      ]
    } else if (openaiKey) {
      model = openai("gpt-4o", { apiKey: openaiKey })
      messages = [
        {
          role: "user",
          content: `The file name is "${file.name}". ${prompt} (You cannot see the PDF – invent plausible questions).`,
        },
      ]
    } else {
      throw new Error("No AI provider API key found.")
    }

    /* ────── 3. Call the model ────── */
    const { object } = await generateObject({
      model,
      schema: quizSchema,
      messages,
    })

    return Response.json(object) // 200
  } catch (err) {
    /* ────── 4. Guaranteed fallback ────── */
    console.error("generate-quiz error:", err instanceof Error ? err.stack : err)

    return Response.json({
      fallback: true,
      error: err instanceof Error ? err.message : "Unknown server error",
      quiz: {
        questions: [
          {
            question: "Fallback question: 2 + 2 = ?",
            options: ["1", "2", "3", "4"],
            answer: "4",
          },
        ],
      },
    })
  }
}
