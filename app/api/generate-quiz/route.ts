"use server"

import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 60 // seconds – extends the default timeout

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { object: quiz } = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        questions: z
          .array(
            z.object({
              question: z.string().describe("The question."),
              options: z.array(z.string()).length(4).describe("An array of 4 possible answers."),
              answer: z.string().describe("The correct answer – one of the options."),
            }),
          )
          .length(10)
          .describe("An array of 10 multiple-choice questions."),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Based on this PDF, generate a challenging 10-question multiple-choice quiz. " +
                "For each question give 4 options and specify the correct answer.",
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

    return new Response(JSON.stringify(quiz), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: "Failed to generate quiz." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
