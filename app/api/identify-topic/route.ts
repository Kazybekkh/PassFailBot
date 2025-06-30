import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, APIError } from "ai"
import { z } from "zod"

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY

if (!OPENAI_KEY) throw new Error("NEXT_PUBLIC_OPENAI_API_KEY is missing. Add it in your Vercel project settings.")

// create a provider instance that works in the browser runtime
const openai = createOpenAI({ apiKey: OPENAI_KEY })

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file)
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        topic: z
          .string()
          .describe(
            "The main topic or subject of the document. E.g., 'Quantum Physics', 'Organic Chemistry', 'World War II History'.",
          ),
      }),
      prompt:
        "Analyze this document and identify its main topic or subject. Provide a concise, one-to-three-word answer.",
      messages: [
        {
          role: "user",
          content: [
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

    return new Response(JSON.stringify(object), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error identifying topic:", error)
    let errorMessage = "Failed to identify topic. An unknown error occurred."
    let statusCode = 500

    if (error instanceof APIError) {
      switch (error.status) {
        case 401:
          errorMessage =
            "Authentication Error: Invalid OpenAI API key. Please check your API key in the project settings."
          statusCode = 401
          break
        default:
          errorMessage = `API Error: ${error.message}`
          statusCode = error.status || 500
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    })
  }
}
