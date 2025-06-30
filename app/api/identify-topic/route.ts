import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 30 // Shorter timeout for topic identification
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

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

    const { object: topicResponse } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: z.object({
        topic: z.string().describe("The main topic or subject of the document, summarized in 2-5 words."),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Briefly identify the main topic or subject of this document in 2-5 words. For example: 'Linear Algebra', 'World War II History', 'Quantum Mechanics'.",
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

    return new Response(JSON.stringify(topicResponse), {
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
    
    return new Response(JSON.stringify({ error: "Failed to identify topic." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
