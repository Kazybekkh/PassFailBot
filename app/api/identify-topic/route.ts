import { createAnthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

/* -------------------------------------------------------------------------- */
/*  CONSTANTS & HELPERS                                                       */
/* -------------------------------------------------------------------------- */

const MAX_FILE_BYTES = 8_000_000 // 8 MB – Claude’s current limit
const MODEL_NAME = "claude-3-5-sonnet-20240620" // supports PDF input

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
  try {
    /* 1. Parse multipart form ------------------------------------------------ */
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) return json({ error: "No file uploaded." }, 400)
    if (file.size > MAX_FILE_BYTES) return json({ error: "PDF larger than 8 MB – upload a smaller file." }, 413)

    /* 2. Select provider and prepare messages ------------------------------ */
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
    const OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY

    let model: Parameters<typeof generateObject>[0]["model"]
    let messages: Parameters<typeof generateObject>[0]["messages"]

    if (ANTHROPIC_KEY) {
      const anthropic = createAnthropic({ apiKey: ANTHROPIC_KEY })
      model = anthropic(MODEL_NAME)
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: "Identify the main topic of this PDF in 2-5 words (no punctuation)." },
            { type: "file", data: await file.arrayBuffer(), mimeType: "application/pdf", filename: file.name },
          ],
        },
      ]
    } else if (OPENAI_KEY) {
      model = openai("gpt-4o", { apiKey: OPENAI_KEY })
      messages = [
        {
          role: "user",
          content: `A file is named "${file.name}". Based on the file name, what is the likely main topic? Respond in 2-5 words (no punctuation).`,
        },
      ]
    } else {
      return json({ error: "Missing AI provider API key." }, 500)
    }

    /* 3. Call the model ------------------------------------------------------ */
    const { object } = await generateObject({
      model,
      schema: z.object({
        topic: z.string().describe("Main topic in 2-5 words, e.g. 'Organic Chemistry'."),
      }),
      messages,
    })

    return json(object) // { topic: "…" }
  } catch (err) {
    /* 4. Soft-fallback so UI can proceed ---------------------------------- */
    console.error("identify-topic (AI error):", err)
    return json({ topic: "Unknown" }) // 200 OK – UI continues gracefully
  }
}
