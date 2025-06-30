import { openai } from "@ai-sdk/openai"
import { generateObject, APIError } from "ai"
import { z } from "zod"

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
    console.error("Error generating quiz:", error)

    let errorMessage = "Failed to generate quiz. An unknown error occurred."
    let statusCode = 500

    if (error instanceof APIError) {
      switch (error.status) {
        case 401:
          errorMessage =
            "Authentication Error: Invalid OpenAI API key or insufficient credits. Please check your API key and account balance."
          statusCode = 401
          break
        case 429:
          errorMessage =
            "Rate Limit Exceeded: You have hit your request limit. Please check your OpenAI plan and billing details."
          statusCode = 429
          break
        case 500:
          errorMessage = "OpenAI Server Error: The AI provider is experiencing issues. Please try again later."
          statusCode = 502 // Bad Gateway
          break
        default:
          errorMessage = `API Error: ${error.message}`
          statusCode = error.status || 500
      }
    } else if (error instanceof Error) {
      // Handle potential timeouts or other Vercel function errors
      if (error.message.includes("timed out")) {
        errorMessage =
          "Request Timed Out: The PDF is likely too large or complex to process in 60 seconds. Please try a smaller file."
        statusCode = 504 // Gateway Timeout
      } else {
        errorMessage = error.message
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    })
  }
}
