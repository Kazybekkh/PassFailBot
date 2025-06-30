import { generateText } from "ai"
import { createGoogle } from "@ai-sdk/google"

/* -------------------------------------------------------------------------- */
/*  HELPERS                                                                   */
/* -------------------------------------------------------------------------- */

const MAX_FILE_BYTES = 8_000_000 // 8 MB

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function cleanTopic(raw: string): string {
  // Keep only the first 5 words, strip punctuation / quotes.
  return raw
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(" ")
}

/* -------------------------------------------------------------------------- */
/*  ROUTE                                                                     */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    /* 1. Parse upload ------------------------------------------------------ */
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return json({ error: "No file uploaded." }, 400)
    if (file.size > MAX_FILE_BYTES) return json({ error: "PDF larger than 8 MB." }, 413)

    /* 2. Check for Google API Key ---------------------------------------- */
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return json({ error: "Google API key not configured." }, 500)
    }

    /* 3. Call Gemini to identify topic from PDF content ------------------ */
    const google = createGoogle({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
    const model = google("models/gemini-1.5-flash-latest")

    const { text } = await generateText({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Respond with ONLY the main topic of this PDF in 2-5 words (no punctuation).",
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

    return json({ topic: cleanTopic(text) })
  } catch (err) {
    console.error("identify-topic error:", err)
    // Soft-fallback so the client can continue
    return json({ topic: "Unknown" })
  }
}
