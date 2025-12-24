import { createFileRoute } from "@tanstack/react-router"
import { generateText } from "ai"
import { experimental_generateSpeech } from "ai"
import { elevenlabs } from "@ai-sdk/elevenlabs"
import { db, initDb } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import crypto from "crypto"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})


const LLM_MODEL = "nousresearch/hermes-3-llama-3.1-405b:free"
// const LLM_MODEL = "xiaomi/mimo-v2-flash:free"
// const LLM_MODEL = "z-ai/glm-4.5-air:free"

const VOICE_ID = "a9QznHbxnuMJcEJmicSn" // testado voice

function createContentHash(pdfId: string, pageNumber: number, totalPages: number, textContent: string): string {
  const content = `${pdfId}-${pageNumber}-${totalPages}-${textContent || ""}`
  return crypto.createHash("sha256").update(content).digest("hex")
}

export const Route = createFileRoute("/api/generate-script/$")({
  server: {
    handlers: {
      POST: async ({ request }) => {
    console.log("[BACKEND] ========== Generate Script Request Started ==========")
    
    const requestBody = await request.json()
    const { pdfId, pageNumber, totalPages, textContent } = requestBody
    
    console.log("[BACKEND] Request params:", {
      pdfId,
      pageNumber,
      totalPages,
      textContentLength: textContent?.length || 0,
      textContentPreview: textContent?.substring(0, 100) || "No text content"
    })

    try {
      console.log("[BACKEND] Initializing database...")
      await initDb()
      console.log("[BACKEND] Database initialized successfully")

      const contentHash = createContentHash(pdfId || "default", pageNumber, totalPages, textContent)
      console.log("[BACKEND] Content hash generated:", contentHash)

      // Check if script is already cached
      console.log("[BACKEND] Checking cache for existing script...")
      const cached = await db.execute({
        sql: "SELECT script, audio_url FROM script_cache WHERE content_hash = ?",
        args: [contentHash],
      })

      if (cached.rows.length > 0) {
        const row = cached.rows[0]
        console.log("[BACKEND] ✅ Cache HIT! Returning cached script and audio")
        console.log("[BACKEND] Cached script length:", (row.script as string)?.length)
        console.log("[BACKEND] Cached audio URL:", row.audio_url)
        return Response.json({
          script: row.script as string,
          audioUrl: row.audio_url as string | null,
          cached: true,
        })
      }

      console.log("[BACKEND] ❌ Cache MISS. Generating new script...")

      const prompt = `You are a professional presentation speaker for an ISO 9001 Internal Auditors training seminar. Generate a natural, engaging presentation script for this slide.

Slide ${pageNumber} of ${totalPages}:
Slide Content: ${textContent || "No text content available"}

Create a 30-50 second speaking script that:
- Sounds natural and conversational (like a real presenter, not just reading the slide)
- Introduces the topic smoothly based on the slide content
- Explains key concepts in an engaging and educational way
- Uses appropriate transitions for the slide number (intro, middle, or conclusion)
- Maintains a professional training/educational tone
- IMPORTANT: The content appears to be in Bosnian/Serbian/Croatian - provide the script in the SAME language as the slide content
- Focus on the main points and make them accessible to the audience

Only return the script text, nothing else.`

      console.log("[BACKEND] Calling OpenRouter LLM with model:", LLM_MODEL)
      console.log("[BACKEND] Prompt length:", prompt.length)
      
      const { text: script } = await generateText({
        model: openrouter(LLM_MODEL),
        prompt,
        temperature: 0.7,
      })

      console.log("[BACKEND] ✅ Script generated successfully!")
      console.log("[BACKEND] Script length:", script.length)
      console.log("[BACKEND] Script preview:", script.substring(0, 150) + "...")

      let audioUrl: string | null = null

      try {
        console.log("[BACKEND] Generating audio with ElevenLabs...")
        console.log("[BACKEND] Voice ID:", VOICE_ID)
        
        const result = await experimental_generateSpeech({
          model: elevenlabs.speech("eleven_turbo_v2_5"),
          text: script,
          voice: VOICE_ID,
        })

        console.log("[BACKEND] Speech result received")
        console.log("[BACKEND] Audio format:", result.audio.format)
        console.log("[BACKEND] Audio mediaType:", result.audio.mediaType)
        
        // Get the audio data directly from the result
        const audioBuffer = Buffer.from(result.audio.uint8Array)
        console.log("[BACKEND] Audio buffer size:", audioBuffer.length, "bytes")

        const audioKey = `audio/${contentHash}.mp3`
        console.log("[BACKEND] Uploading audio to R2 with key:", audioKey)
        audioUrl = await uploadToR2(audioKey, audioBuffer, result.audio.mediaType || "audio/mpeg")
        console.log("[BACKEND] ✅ Audio uploaded successfully! URL:", audioUrl)
      } catch (audioError) {
        console.error("[BACKEND] ❌ ElevenLabs audio generation error:", audioError)
        console.error("[BACKEND] Audio error details:", {
          message: audioError instanceof Error ? audioError.message : String(audioError),
          stack: audioError instanceof Error ? audioError.stack : undefined
        })
      }

      console.log("[BACKEND] Saving to cache...")
      await db.execute({
        sql: `INSERT INTO script_cache (content_hash, pdf_id, page_number, total_pages, script, audio_url) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [contentHash, pdfId || "default", pageNumber, totalPages, script, audioUrl],
      })
      console.log("[BACKEND] ✅ Saved to cache successfully")

      console.log("[BACKEND] ========== Request Complete ==========")
      console.log("[BACKEND] Returning:", { 
        scriptLength: script.length, 
        audioUrl: audioUrl || "null", 
        cached: false 
      })
      
      return Response.json({ script, audioUrl, cached: false })
    } catch (error) {
      console.error("[BACKEND] ❌❌❌ FATAL ERROR generating script:", error)
      console.error("[BACKEND] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        name: error instanceof Error ? error.name : undefined
      })
      return Response.json({ 
        script: "Unable to generate script for this slide.", 
        audioUrl: null,
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }
      },
    },
  },
})

