import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"

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

    /* 2. Select provider --------------------------------------------------- */
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY

    if (!anthropicKey && !openaiKey) return json({ error: "No AI provider API key found." }, 500)

    let topicText: string

    if (anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey })
      const { text } = await generateText({
        model: anthropic("claude-3-5-sonnet-20240620"),
        // Switched from `prompt` to `messages` for multimodal input
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
      topicText = text
    } else {
      // OpenAI fallback (no PDF context—use filename hint)
      const { text } = await generateText({
        model: openai("gpt-4o", { apiKey: openaiKey! }),
        prompt: `A file is named "${file.name}". In 2-5 words and without punctuation, what is its likely topic?`,
      })
      topicText = text
    }

    return json({ topic: cleanTopic(topicText) })
  } catch (err) {
    console.error("identify-topic error:", err)
    // Soft-fallback so the client can continue
    return json({ topic: "Unknown" })
  }
}
