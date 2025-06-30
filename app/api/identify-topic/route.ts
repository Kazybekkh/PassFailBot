import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, APIError } from "ai"
import { z } from "zod"

// NOTE: Don't check for key here, check inside the handler

export const maxDuration = 30 // seconds
const MAX_FILE_BYTES = 8_000_000 // 8 MB

export async function POST(req: Request) {
  try {
    // 1. Validate API Key
    const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (!OPENAI_KEY) {
      return jsonError(
        "OpenAI API key is not configured. Please add NEXT_PUBLIC_OPENAI_API_KEY to your environment variables.",
        500,
      )
    }
    const openai = createOpenAI({ apiKey: OPENAI_KEY })

    // 2. Validate Request Body
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) return jsonError("No file uploaded", 400)
    if (file.size > MAX_FILE_BYTES) return jsonError("PDF larger than 8 MB – upload a smaller file.", 413)

    // 3. Call AI
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        topic: z
          .string()
          .describe("A short, concise topic name for the document, e.g., 'Quantum Physics' or 'British History'."),
      }),
      prompt: "Analyze this PDF and identify its main topic. Provide a short, concise topic name.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this PDF and identify its main topic." },
            { type: "file", data: await file.arrayBuffer(), mimeType: "application/pdf", filename: file.name },
          ],
        },
      ],
    })

    return Response.json(object)
  } catch (err) {
    console.error("identify-topic:", err)
    return jsonError(apiMessage(err), apiStatus(err))
  }
}

/* helpers ------------------------------------------------------------------*/

function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function apiStatus(err: unknown): number {
  if (err instanceof APIError) return err.status
  return 500
}

function apiMessage(err: unknown): string {
  if (err instanceof APIError) return err.message
  if (err instanceof Error) return err.message
  return "An unknown error occurred."
}
