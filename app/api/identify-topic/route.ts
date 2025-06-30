import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, APIError } from "ai"
import { z } from "zod"

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY

if (!OPENAI_KEY) throw new Error("NEXT_PUBLIC_OPENAI_API_KEY is missing. Add it in your Vercel project settings.")

// Provider instance (Node runtime)
const openai = createOpenAI({ apiKey: OPENAI_KEY })

/** Maximum file size OpenAI will accept for a single request (≈8 MB). */
const MAX_FILE_BYTES = 8_000_000

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file)
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })

    if (file.size > MAX_FILE_BYTES) {
      return new Response(
        JSON.stringify({
          error: "PDF is larger than 8 MB – please upload a smaller file or split it first.",
        }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      )
    }

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
    const errorMessage = error instanceof Error ? error.message : "Unknown server error"
    const statusCode = error instanceof APIError ? error.status : 500

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    })
  }
}
