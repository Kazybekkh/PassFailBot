import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, APIError } from "ai"
import { z } from "zod"

/* -------------------------------------------------------------------------- */
/*  CONFIG                                                                    */
/* -------------------------------------------------------------------------- */

const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
if (!OPENAI_KEY) {
  throw new Error("NEXT_PUBLIC_OPENAI_API_KEY is missing – add it in your Vercel / .env project settings.")
}

const openai = createOpenAI({ apiKey: OPENAI_KEY })

/** Hard limit imposed by OpenAI for a single PDF file (~8 MB). */
const MAX_FILE_BYTES = 8_000_000

/* -------------------------------------------------------------------------- */
/*  ROUTE                                                                     */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return jsonError("No file uploaded", 400)
    }

    if (file.size > MAX_FILE_BYTES) {
      return jsonError("PDF larger than 8 MB – upload a smaller file.", 413)
    }

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        topic: z.string().describe("Main topic of the document in 2–5 words (e.g. 'Linear Algebra')"),
      }),
      prompt: "Identify the main topic or subject of this document in 2-5 words (e.g. 'Quantum Mechanics').",
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

    return Response.json(object) // => { topic: "…" }
  } catch (err) {
    console.error("identify-topic:", err)
    return jsonError(apiMessage(err), apiStatus(err))
  }
}

/* -------------------------------------------------------------------------- */
/*  HELPERS                                                                   */
/* -------------------------------------------------------------------------- */

function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function apiStatus(err: unknown) {
  return err instanceof APIError ? err.status : 500
}

function apiMessage(err: unknown) {
  if (err instanceof APIError) return err.message
  if (err instanceof Error) return err.message
  return "Unknown server error"
}
