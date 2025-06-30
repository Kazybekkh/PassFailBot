import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 60 // Extend timeout for AI generation
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('Google AI API key not found in environment variables')
      return new Response(JSON.stringify({ 
        error: "API configuration error. Please check server configuration." 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const quizStyle = formData.get("style") as "strict" | "similar" // UPDATED: Get style from form data

    if (!file)
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })

    // Check file size (limit to 5MB for better API compatibility)
    const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxFileSize) {
      return new Response(JSON.stringify({ 
        error: "File too large. Please upload a PDF smaller than 5MB." 
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

    console.log('Processing file for quiz:', file.name, 'Size:', file.size, 'Style:', quizStyle)

    let fileData: ArrayBuffer
    try {
      fileData = await file.arrayBuffer()
      console.log('File buffer created successfully, size:', fileData.byteLength)
    } catch (fileError) {
      console.error('Failed to process file buffer:', fileError)
      return new Response(JSON.stringify({ 
        error: "Failed to process uploaded file. Please try again." 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // UPDATED: Define different prompts based on the selected style (optimized for faster processing)
    const strictPrompt =
      "Generate a 10-question multiple-choice quiz from this PDF. Each question needs 4 options with the correct answer specified."
    const similarPrompt =
      "Create a 10-question multiple-choice quiz similar in style to this PDF content, but with new questions. Use plain text (no LaTeX). Each question needs 4 options with the correct answer specified."
    const promptText = quizStyle === "similar" ? similarPrompt : strictPrompt

    console.log('Starting Gemini API call for quiz generation...')
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
              data: fileData,
              mimeType: "application/pdf",
              filename: file.name,
            },
          ],
        },
      ],
    })
    console.log('Quiz generation successful, questions generated:', quiz.questions.length)

    return new Response(JSON.stringify(quiz), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error('Quiz generation error:', error)
    console.error('Error type:', typeof error)
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    
    // Check if it's a quota/rate limit error
    if (error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
      return new Response(JSON.stringify({ 
        error: "API quota exceeded. Please try again later or check your Google AI API limits." 
      }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    // Check for authentication errors
    if (error?.message?.includes('API key') || error?.message?.includes('authentication')) {
      return new Response(JSON.stringify({ 
        error: "API authentication failed. Please check your Google AI API key." 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    // Check for network/timeout errors
    if (error?.message?.includes('timeout') || error?.message?.includes('network')) {
      return new Response(JSON.stringify({ 
        error: "Network timeout. Please try again with a smaller PDF." 
      }), {
        status: 504,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    return new Response(JSON.stringify({ 
      error: "Failed to generate quiz.",
      details: error?.message || "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
