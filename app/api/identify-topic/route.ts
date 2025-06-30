import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

/* -------------------------------------------------------------------------- */
/*  CONSTANTS                                                                 */
/* -------------------------------------------------------------------------- */
const MAX_FILE_BYTES = 8_000_000 // 8 MB – OpenAI hard-limit
const MODEL_NAME = "gpt-4o-mini" // fast + cheaper

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
  const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
  if (!API_KEY)
    return json(
      {
        error: "Missing NEXT_PUBLIC_OPENAI_API_KEY. Add it in your Project ➜ Settings ➜ Environment Variables.",
      },
      500,
    )

  const openai = createOpenAI({ apiKey: API_KEY })

  /* 3. Call the model – and fall back safely ------------------------------ */
  try {
    const { object } = await generateObject({
      model: openai(MODEL_NAME),
      schema: z.object({
        topic: z.string().describe("Main topic in 2-5 words, e.g. 'Organic Chemistry'."),
      }),
      prompt: "Identify the main topic of this document in 2-5 words (no punctuation).",
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

    // success
    return json(object)
  } catch (err) {
    /* -------------------------------------------------------------------- */
    /*  Any model error → log + soft-fallback so UI can continue            */
    /* -------------------------------------------------------------------- */
    console.error("identify-topic (OpenAI error):", err)
    return json({ topic: "Unknown" }) // 200 OK – client will just show “Unknown”
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
