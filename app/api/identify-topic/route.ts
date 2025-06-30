import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 30 // Shorter timeout for topic identification

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

    const { object: topicResponse } = await generateObject({
      model: openai("gpt-4o"),
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
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: "Failed to identify topic." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
