import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, APIError } from "ai"
import { z } from "zod"

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
if (!OPENAI_KEY) throw new Error("NEXT_PUBLIC_OPENAI_API_KEY is missing. Add it in your project settings.")

const openai = createOpenAI({ apiKey: OPENAI_KEY })

/** ≈8 MB – the hard limit for a single PDF in the OpenAI chat/file message API. */
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

    if (file.size > MAX_FILE_BYTES)
      return new Response(JSON.stringify({ error: "PDF larger than 8 MB – please upload a smaller file." }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      })

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        topic: z.string().describe("Main topic of the document in 2-5 words"),
      }),
      prompt:
        "Identify the main topic or subject of this document in 2-5 words (e.g. 'Linear Algebra', 'World War II').",
      messages: [
        {
          role: "user",
          content: [{ type: "file", data: await file.arrayBuffer(), mimeType: "application/pdf", filename: file.name }],
        },
      ],
    })

    return Response.json(object)
  } catch (err) {
    console.error("identify-topic:", err)
    const status = err instanceof APIError ? err.status : 500
    const msg = err instanceof APIError ? err.message : err instanceof Error ? err.message : "Unknown server error."
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }
}
