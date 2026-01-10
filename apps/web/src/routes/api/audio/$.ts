import { createFileRoute } from "@tanstack/react-router"
import { getFromR2 } from "@/lib/r2"

export const Route = createFileRoute("/api/audio/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          // Get the audio key from the path (everything after /api/audio/)
          const audioKey = url.pathname.replace("/api/audio/", "")
          
          if (!audioKey) {
            return new Response("Audio key required", { status: 400 })
          }

          console.log("[AUDIO API] Fetching audio:", audioKey)
          
          const result = await getFromR2(`audio/${audioKey}`)
          
          if (!result.Body) {
            return new Response("Audio not found", { status: 404 })
          }

          // Convert the readable stream to array buffer
          const chunks: Uint8Array[] = []
          const reader = result.Body.transformToWebStream().getReader()
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
          }
          
          const audioBuffer = Buffer.concat(chunks)
          
          console.log("[AUDIO API] Serving audio, size:", audioBuffer.length, "bytes")

          return new Response(audioBuffer, {
            headers: {
              "Content-Type": result.ContentType || "audio/mpeg",
              "Content-Length": audioBuffer.length.toString(),
              "Cache-Control": "public, max-age=31536000, immutable",
              "Accept-Ranges": "bytes",
            },
          })
        } catch (error) {
          console.error("[AUDIO API] Error:", error)
          return new Response("Error fetching audio", { status: 500 })
        }
      },
    },
  },
})

