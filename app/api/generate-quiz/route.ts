import { generateObject } from "ai"
import { createGroq } from "@ai-sdk/groq"
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

    /* 2. Check for Groq API Key ---------------------------------------- */
    if (!process.env.GROQ_API_KEY) {
      return jsonError("Groq API key not configured.", 500)
    }

    /* 3. Generate quiz with Groq based on filename --------------------- */
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
    const model = groq("llama3-70b-8192") // Use a powerful model for generation

    // IMPORTANT: Groq cannot read PDF files. The prompt must rely on the filename.
    const promptStrict = `Based on the filename "${file.name}", generate 10 multiple-choice questions. The questions should be what one might expect from a document with this name.`
    const promptSimilar = `Based on the filename "${file.name}", invent 10 new multiple-choice questions on the likely topic and difficulty.`
    const prompt = style === "strict" ? promptStrict : promptSimilar

    const { object } = await generateObject({
      model,
      schema: QUIZ_SCHEMA,
      prompt,
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
