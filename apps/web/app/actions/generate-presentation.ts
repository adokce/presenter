"use server"

import { generateText } from "ai"

type Slide = {
  title: string
  content: string[]
  script: string
}

export async function generatePresentation(topic: string, audience: string): Promise<Slide[]> {
  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `Create a professional presentation about "${topic}" for ${audience}.

Generate exactly 5-7 slides with the following structure:

For each slide, provide:
1. A clear, engaging title (max 10 words)
2. 3-4 concise bullet points (each max 15 words)
3. A natural speaker script (2-3 sentences) that elaborates on the key points

Format your response as JSON array with this exact structure:
[
  {
    "title": "Slide Title",
    "content": ["Point 1", "Point 2", "Point 3"],
    "script": "Natural speaking script for this slide..."
  }
]

Make the content engaging, informative, and appropriate for the audience. Ensure smooth flow between slides.`,
    })

    // Parse the JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("Failed to parse presentation data")
    }

    const slides: Slide[] = JSON.parse(jsonMatch[0])
    return slides
  } catch (error) {
    console.error("[v0] Error generating presentation:", error)
    // Return fallback slides
    return [
      {
        title: `Introduction to ${topic}`,
        content: ["Overview of the topic", "Why it matters", "What we'll cover today"],
        script: `Welcome to this presentation about ${topic}. Today we'll explore this important subject and understand why it matters for ${audience}.`,
      },
    ]
  }
}
