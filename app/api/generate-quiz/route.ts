import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

export const maxDuration = 60 // Extend timeout for AI generation

export async function POST(req: Request)
\
{
  try \{
    // 1. Get the form data from the request, which includes the file.
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) \\
      return new Response(JSON.stringify(\{ error: "No file uploaded\" \}), \{\
        status: 400,\
        headers: \{ \"Content-Type\": \"application/json" \},\
      \})\
    \}

    // 2. Use the AI SDK to generate a structured quiz object.
    // We tell it which model to use (OpenAI's gpt-4o).\
    const \{ object: quiz \} = await generateObject(\{
      model: openai("gpt-4o"),
      // We define the exact structure we want the quiz in.\
      schema: z.object(\{
        questions: z
          .array(\
            z.object(\{
              question: z.string().describe("The question."),
              options: z.array(z.string()).describe("An array of 4 possible answers."),
              answer: z.string().describe("The correct answer from the options."),\
            \}),
          )
          .describe("An array of 10 multiple-choice questions."),\
      \}),
      // 3. This is the core of the request. We send two things to the AI:
      //    - A text prompt telling it what to do.
      //    - The PDF file itself for the AI to read and analyze.
      messages: [\
        \{
          role: "user",
          content: [
            {
              type: "text",
              text: "Based on this PDF, generate a challenging 10-question multiple-choice quiz. For each question give 4 options and specify the correct answer.",
            },
            {
              type: "file",
              data: await file.arrayBuffer(), // The actual content of your uploaded PDF.
              mimeType: "application/pdf",
              filename: file.name,
            },
          ],\
        \},
      ],\
    \})

    // 4. Return the generated quiz to the frontend.\
    return new Response(JSON.stringify(quiz), \{
      status: 200,\
      headers: \{ "Content-Type\": \"application/json" \},\
    \})\
  \catch (error) \
    console.error(error)\
    return new Response(JSON.stringify(\{ error: "Failed to generate quiz.\" \}), \{\
      status: 500,\
      headers: \{ \"Content-Type\": \"application/json" \},
    \})
  \}
\}
