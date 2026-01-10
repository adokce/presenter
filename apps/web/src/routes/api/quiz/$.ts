import { createFileRoute } from "@tanstack/react-router"
import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

const MODEL = "openai/gpt-4o-mini"

type SlideChunk = { page: number; text: string }
type QuizQuestion = {
  id: string
  question: string
  type: "single" | "multiple"
  options: string[]
  correctAnswers: string[] // Added: correct answer(s) for grading
}

type GenerateRequest = {
  mode: "generate"
  chunkId: number
  slides: SlideChunk[]
}

const asJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

export const Route = createFileRoute("/api/quiz/$")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        const mode = body?.mode as "generate" | "grade" | undefined

        if (!mode) {
          return new Response("mode is required", { status: 400 })
        }

        if (mode === "generate") {
          const { slides, chunkId } = body as GenerateRequest
          if (!slides?.length || !chunkId) {
            return new Response("slides and chunkId are required", { status: 400 })
          }

          const slidesText = slides
            .map((s) => `Slide ${s.page}: ${s.text || "No text"}`)
            .join("\n")

          const prompt = `You are creating a short knowledge check from training slides.
Slides (last 3): 
${slidesText}

Generate exactly 3 EASY questions that focus on core facts from these slides.
Mix radio (single correct) and checkbox (multiple correct) styles.

IMPORTANT: Include the correct answer(s) for each question so we can grade automatically.

Return ONLY JSON in this shape:
{
  "questions": [
    {
      "id": "q1",
      "question": "What ...?",
      "type": "single",
      "options": ["A", "B", "C", "D"],
      "correctAnswers": ["A"]
    },
    {
      "id": "q2",
      "question": "Which of the following...?",
      "type": "multiple",
      "options": ["A", "B", "C", "D"],
      "correctAnswers": ["A", "C"]
    }
  ]
}

Rules:
- For "single" type: correctAnswers should have exactly 1 option
- For "multiple" type: correctAnswers should have 2+ options
- correctAnswers must be exact matches from the options array
`

          const { text } = await generateText({
            model: openrouter(MODEL),
            prompt,
            temperature: 0.4,
          })

          const json = asJson(text)
          if (!json?.questions) {
            return new Response("Failed to generate quiz", { status: 500 })
          }

          return Response.json({
            chunkId,
            questions: json.questions as QuizQuestion[],
          })
        }

        

        return new Response("Unsupported mode", { status: 400 })
      },
    },
  },
})


