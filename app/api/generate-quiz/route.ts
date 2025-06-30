import { generateObject } from "ai"
import { createGoogle } from "@ai-sdk/google"
import { z } from "zod"

/* -------------------------------------------------------------------------- */
/*  CONFIG                                                                    */
/* -------------------------------------------------------------------------- */

const MAX_FILE_BYTES = 8_000_000

const QUIZ_SCHEMA = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        answer: z.string(),
      }),
    )
    .min(8)
    .max(12),
})

const FALLBACK_QUIZ = {
  questions: [
    {
      question: "Fallback question: 2 + 2 = ?",
      options: ["1", "2", "3", "4"],
      answer: "4",
    },
  ],
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/* -------------------------------------------------------------------------- */
/*  ROUTE                                                                     */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    /* 1. Parse multipart form ------------------------------------------ */
    const form = await req.formData()
    const file = form.get("file") as File | null
    const style = form.get("style") as "strict" | "similar" | null

    if (!file) return jsonError("No file uploaded.")
    if (!style) return jsonError("Quiz style missing.")
    if (file.size > MAX_FILE_BYTES) return jsonError("PDF exceeds 8 MB.", 413)

    /* 2. Check for Google API Key ---------------------------------------- */
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return jsonError("Google API key not configured.", 500)
    }

    /* 3. Generate quiz with Gemini from PDF content -------------------- */
    const google = createGoogle({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
    const model = google("models/gemini-1.5-pro-latest")

    const promptStrict = "Generate 10 multiple-choice questions strictly from the provided PDF content."
    const promptSimilar =
      "Invent 10 new multiple-choice questions on the same topic and difficulty as the provided PDF."
    const prompt = style === "strict" ? promptStrict : promptSimilar

    const { object } = await generateObject({
      model,
      schema: QUIZ_SCHEMA,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
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

    return Response.json(object)
  } catch (err) {
    /* 4. Catastrophic / unexpected error ------------------------------- */
    console.error("generate-quiz fatal error:", err)
    return Response.json({
      fallback: true,
      error: err instanceof Error ? err.message : "Unknown server error",
      quiz: FALLBACK_QUIZ,
    })
  }
}
