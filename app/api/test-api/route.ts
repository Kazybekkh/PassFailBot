import { google } from "@ai-sdk/google"
import { generateText } from "ai"

export const maxDuration = 10

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "Google AI API key not configured",
        configured: false
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Test the API connection with a simple request
    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: "Respond with exactly: 'API working'",
      maxTokens: 10,
    })

    return new Response(JSON.stringify({ 
      status: "ok",
      configured: true,
      response: text.trim(),
      model: "gemini-1.5-flash"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error('API test error:', error)
    
    return new Response(JSON.stringify({ 
      error: "API test failed",
      configured: true,
      details: error?.message || "Unknown error",
      errorType: error?.name || "Unknown"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
