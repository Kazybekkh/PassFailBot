import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, APIError } from "ai"
import { z } from "zod"

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY

if (!OPENAI_KEY) throw new Error("NEXT_PUBLIC_OPENAI_API_KEY is missing. Add it in your Vercel project settings.")

// create a provider instance that works in the browser runtime
const openai = createOpenAI({ apiKey: OPENAI_KEY })

export const maxDuration = 60 // Extend timeout for AI generation

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const quizStyle = formData.get("style") as "strict" | "similar" // UPDATED: Get style from form data

    if (!file)
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })

    // UPDATED: Define different prompts based on the selected style
    const strictPrompt =
      "Based on this PDF, generate a challenging 10-question multiple-choice quiz. For each question give 4 options and specify the correct answer."
    const similarPrompt =
      "Analyze the style, format, and difficulty of the content in this PDF. First, determine if the document contains mathematical problems or equations. Then, generate a new, challenging 10-question multiple-choice quiz that is *similar in style* to the content provided, but with different questions and values. The questions should not be directly from the PDF, but should test the same concepts at a similar level. **Crucially, if the original document contained math, ensure the new math questions you generate are written in plain text and do NOT use LaTeX formatting (e.g., avoid `$`, `\\(`, `\\[`, `\\frac`, `\\sum`, etc.).** For each question give 4 options and specify the correct answer."
    const promptText = quizStyle === "similar" ? similarPrompt : strictPrompt

    const { object: quiz } = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        questions: z
          .array(
            z.object({
              question: z.string().describe("The question."),
              options: z.array(z.string()).describe("An array of 4 possible answers."),
              answer: z.string().describe("The correct answer from the options."),
            }),
          )
          .describe("An array of 10 multiple-choice questions."),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText, // UPDATED: Use the selected prompt
            },
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

    return new Response(JSON.stringify(quiz), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error(error)
    let errorMessage = "Failed to generate quiz."
    if (error instanceof APIError && error.status === 401) {
      errorMessage = "Invalid or missing OpenAI key. Check NEXT_PUBLIC_OPENAI_API_KEY in your env vars."
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
