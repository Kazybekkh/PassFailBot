import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"

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

    /* 2. Check for Groq API Key ------------------------------------------ */
    if (!process.env.GROQ_API_KEY) {
      return json({ error: "Groq API key not configured." }, 500)
    }

    /* 3. Call Groq to identify topic from filename ----------------------- */
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
    const model = groq("llama3-8b-8192") // 8b is fast and sufficient for this

    const { text } = await generateText({
      model,
      prompt: `A file is named "${file.name}". In 2-5 words and without punctuation, what is its likely topic? Respond with ONLY the topic.`,
    })

    return json({ topic: cleanTopic(text) })
  } catch (err) {
    console.error("identify-topic error:", err)
    // Soft-fallback so the client can continue
    return json({ topic: "Unknown" })
  }
}
