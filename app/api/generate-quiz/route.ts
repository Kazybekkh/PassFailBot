import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 60 // Extend timeout for AI generation
export const runtime = 'nodejs'

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

    // Check file size (limit to 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxFileSize) {
      return new Response(JSON.stringify({ 
        error: "File too large. Please upload a PDF smaller than 10MB." 
      }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Check file type
    if (file.type !== "application/pdf") {
      return new Response(JSON.stringify({ 
        error: "Invalid file type. Please upload a PDF file." 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // UPDATED: Define different prompts based on the selected style
    const strictPrompt =
      "Based on this PDF, generate a challenging 10-question multiple-choice quiz. For each question give 4 options and specify the correct answer."
    const similarPrompt =
      "Analyze the style, format, and difficulty of the content in this PDF. First, determine if the document contains mathematical problems or equations. Then, generate a new, challenging 10-question multiple-choice quiz that is *similar in style* to the content provided, but with different questions and values. The questions should not be directly from the PDF, but should test the same concepts at a similar level. **Crucially, if the original document contained math, ensure the new math questions you generate are written in plain text and do NOT use LaTeX formatting (e.g., avoid `$`, `\\(`, `\\[`, `\\frac`, `\\sum`, etc.).** For each question give 4 options and specify the correct answer."
    const promptText = quizStyle === "similar" ? similarPrompt : strictPrompt

    const { object: quiz } = await generateObject({
      model: google("gemini-1.5-flash"),
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
  } catch (error: any) {
    console.error(error)
    
    // Check if it's a quota/rate limit error
    if (error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
      return new Response(JSON.stringify({ 
        error: "API quota exceeded. Please try again later or check your Google AI API limits." 
      }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    return new Response(JSON.stringify({ error: "Failed to generate quiz." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
