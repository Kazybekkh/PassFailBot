import { createAnthropic } from "@ai-sdk/anthropic"
import { generateObject } from "ai"
import { z } from "zod"

/* -------------------------------------------------------------------------- */
/*  CONSTANTS & HELPERS                                                       */
/* -------------------------------------------------------------------------- */

const MAX_FILE_BYTES = 8_000_000 // 8 MB – OpenAI’s file limit
const MODEL_NAME = "claude-3-sonnet-20240229" // supports PDF input

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/* -------------------------------------------------------------------------- */
/*  ROUTE                                                                     */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  /* 1. Parse multipart form ------------------------------------------------ */
  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) return json({ error: "No file uploaded." }, 400)
  if (file.size > MAX_FILE_BYTES) return json({ error: "PDF larger than 8 MB – upload a smaller file." }, 413)

  /* 2. Ensure API key ------------------------------------------------------ */
  const API_KEY = process.env.ANTHROPIC_API_KEY
  if (!API_KEY) return json({ error: "Missing ANTHROPIC_API_KEY in environment variables." }, 500)

  const anthropic = createAnthropic({ apiKey: API_KEY })

  /* 3. Call the model ------------------------------------------------------ */
  try {
    const { object } = await generateObject({
      model: anthropic(MODEL_NAME),
      schema: z.object({
        topic: z.string().describe("Main topic in 2-5 words, e.g. 'Organic Chemistry'."),
      }),
      // ⚠️  Use EITHER prompt OR messages – not both!
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify the main topic of this PDF in 2-5 words (no punctuation).",
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

    return json(object) // { topic: "…" }
  } catch (err) {
    /* 4. Soft-fallback so UI can proceed ---------------------------------- */
    console.error("identify-topic (Anthropic error):", err)
    return json({ topic: "Unknown" }) // 200 OK – UI continues gracefully
  }
}
