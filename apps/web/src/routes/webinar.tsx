import { useEffect, useState, lazy, Suspense } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { getUser } from "@/functions/get-user"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { m } from "@/paraglide/messages"

const PDFGallery = lazy(() => import("@/components/pdf-gallery"))

type QuizQuestion = {
  id: string
  question: string
  type: "single" | "multiple"
  options: string[]
  correctAnswers: string[]
}

type QuizPayload = {
  chunkId: number
  questions: QuizQuestion[]
}

type QuizResult = {
  passed: boolean
  feedback: string
  score: number
}

export const Route = createFileRoute("/webinar")({
  component: WebinarPage,
  beforeLoad: async () => {
    const session = await getUser()
    return { session }
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function WebinarPage() {
  // Configuration: Quiz frequency (how many slides between quizzes)
  const SLIDES_PER_QUIZ = 4

  const { session } = Route.useRouteContext()
  const [pageNumber, setPageNumber] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [slideTexts, setSlideTexts] = useState<Record<number, string>>({})
  const [quiz, setQuiz] = useState<QuizPayload | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [isFetchingQuiz, setIsFetchingQuiz] = useState(false)
  const [completedChunks, setCompletedChunks] = useState<Set<number>>(new Set())
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [completedQuizzes, setCompletedQuizzes] = useState<Record<number, QuizResult>>({})

  const handleTextExtracted = (page: number, text: string) => {
    setSlideTexts((prev) => ({ ...prev, [page]: text }))
  }

  // Fetch quiz every N slides (informational only)
  const shouldTriggerQuiz = pageNumber > 0 && pageNumber % SLIDES_PER_QUIZ === 0
  const chunkId = Math.floor((pageNumber - 1) / SLIDES_PER_QUIZ) + 1
  const getChunkPages = (id: number) => {
    const start = (id - 1) * SLIDES_PER_QUIZ + 1
    return Array.from({ length: SLIDES_PER_QUIZ }, (_, i) => start + i)
  }
  const currentChunkPages = getChunkPages(chunkId)
  const quizChunkPages = quiz ? getChunkPages(quiz.chunkId) : currentChunkPages

  const allChunkTextAvailable = currentChunkPages.every((p) => slideTexts[p])

  const fetchQuiz = async (force = false) => {
    const targetChunkId = quiz?.chunkId ?? chunkId
    const pages = quiz ? quizChunkPages : currentChunkPages
    const ready = pages.every((p) => slideTexts[p])

    if (!ready || (completedChunks.has(targetChunkId) && !force)) return

    try {
      setIsFetchingQuiz(true)
      setQuizResult(null)
      setAnswers({})

      const response = await fetch("/api/quiz/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          chunkId: targetChunkId,
          slides: pages.map((page) => ({
            page,
            text: slideTexts[page],
          })),
        }),
      })

      const data = await response.json()
      if (response.ok && data?.questions) {
        setQuiz({ chunkId: targetChunkId, questions: data.questions })
      } else {
        console.error("Failed to generate quiz", data)
      }
    } catch (error) {
      console.error("Quiz generation error", error)
    } finally {
      setIsFetchingQuiz(false)
    }
  }

  // Trigger quiz modal when arriving at every 3rd slide
  useEffect(() => {
    if (shouldTriggerQuiz && allChunkTextAvailable && !completedChunks.has(chunkId)) {
      setShowQuizModal(true)
      fetchQuiz()
    }
    // We intentionally depend on slideTexts via allChunkTextAvailable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldTriggerQuiz, allChunkTextAvailable, chunkId, completedChunks])

  const handleAnswerChange = (questionId: string, option: string, type: "single" | "multiple") => {
    setAnswers((prev) => {
      const current = prev[questionId] || []
      if (type === "single") {
        return { ...prev, [questionId]: [option] }
      }

      const exists = current.includes(option)
      const next = exists ? current.filter((o) => o !== option) : [...current, option]
      return { ...prev, [questionId]: next }
    })
  }

  const submitQuiz = () => {
    if (!quiz) return

    // Grade locally using correctAnswers from the quiz
    let correctCount = 0
    const totalQuestions = quiz.questions.length

    for (const question of quiz.questions) {
      const userAnswer = answers[question.id] || []
      const correctAnswer = question.correctAnswers || []

      // Sort both arrays for comparison
      const userSorted = [...userAnswer].sort()
      const correctSorted = [...correctAnswer].sort()

      // Check if arrays match
      const isCorrect =
        userSorted.length === correctSorted.length &&
        userSorted.every((val, idx) => val === correctSorted[idx])

      if (isCorrect) {
        correctCount++
      }
    }

    const score = Math.round((correctCount / totalQuestions) * 100)
    const passed = score >= 70

    let feedback = ""
    if (score === 100) {
      feedback = m.feedback_perfect()
    } else if (passed) {
      feedback = m.feedback_passed({ correct: correctCount, total: totalQuestions })
    } else {
      feedback = m.feedback_failed({ correct: correctCount, total: totalQuestions })
    }

    const result = { passed, feedback, score }
    setQuizResult(result)
    setCompletedChunks((prev) => new Set(prev).add(quiz.chunkId))
    setCompletedQuizzes((prev) => ({ ...prev, [quiz.chunkId]: result }))
  }

  const closeQuizModal = () => {
    if (quizResult) {
      setShowQuizModal(false)
      setQuiz(null)
      setAnswers({})
      setQuizResult(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{m.webinar_title()}</h1>
            <p className="text-muted-foreground mt-1">
              {m.welcome_user({ name: session?.user.name ?? "" })}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {numPages > 0 && (
              <span>
                {m.slide_counter({ current: pageNumber, total: numPages })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          }
        >
          <PDFGallery
            file="/presentation_demo.pdf"
            pageNumber={pageNumber}
            onPageChange={(page) => {
              setPageNumber(page)
            }}
            onNumPagesChange={setNumPages}
            onTextExtracted={handleTextExtracted}
          />
        </Suspense>
      </div>

      {/* Completed quizzes summary */}
      {Object.keys(completedQuizzes).length > 0 && (
        <div className="border-t bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline">{m.completed_quizzes()}</Badge>
            <p className="text-sm text-muted-foreground">
              {m.quiz_results_session()}
            </p>
          </div>
          <div className="space-y-2">
            {Object.entries(completedQuizzes).map(([chunkIdStr, result]) => {
              const id = Number(chunkIdStr)
              const pages = getChunkPages(id)
              return (
                <Card key={id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {m.slides_range({ start: pages[0], end: pages[pages.length - 1] })}
                      </Badge>
                      <span className="text-sm font-medium">
                        {m.score_label({ score: result.score })}
                      </span>
                    </div>
                    <Badge
                      className={cn(
                        "text-xs",
                        result.passed
                          ? "bg-emerald-500 text-emerald-900"
                          : "bg-amber-500 text-amber-900"
                      )}
                    >
                      {result.passed ? m.passed() : m.keep_practicing()}
                    </Badge>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Quiz Modal - Non-skippable */}
      <Dialog open={showQuizModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {quiz
                ? m.quiz_title_range({
                    start: quizChunkPages[0],
                    end: quizChunkPages[quizChunkPages.length - 1],
                  })
                : m.loading_quiz()}
            </DialogTitle>
            <DialogDescription>
              {m.quiz_description()}
            </DialogDescription>
          </DialogHeader>

          {isFetchingQuiz && !quiz ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">
                {m.generating_quiz_questions()}
              </span>
            </div>
          ) : quiz ? (
            <div className="space-y-6 py-4">
              {quiz.questions.map((q, idx) => (
                <div key={q.id} className="space-y-3">
                  <p className="font-medium text-base">
                    {idx + 1}. {q.question}
                  </p>
                  {q.type === "single" ? (
                    <RadioGroup
                      value={answers[q.id]?.[0] || ""}
                      onValueChange={(value) => handleAnswerChange(q.id, String(value), "single")}
                      disabled={!!quizResult}
                    >
                      {q.options.map((opt) => (
                        <div key={opt} className="flex items-center space-x-2">
                          <RadioGroupItem value={String(opt)} id={`modal-${q.id}-${opt}`} />
                          <label
                            htmlFor={`modal-${q.id}-${opt}`}
                            className="text-sm leading-none cursor-pointer"
                          >
                            {opt}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const checked = answers[q.id]?.includes(opt) || false
                        return (
                          <label
                            key={opt}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => handleAnswerChange(q.id, opt, "multiple")}
                              disabled={!!quizResult}
                            />
                            {opt}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}

              {quizResult && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {m.score_label({ score: quizResult.score })}
                    </p>
                    <Badge
                      className={cn(
                        quizResult.passed
                          ? "bg-emerald-500 text-emerald-900"
                          : "bg-amber-500 text-amber-900"
                      )}
                    >
                      {quizResult.passed ? m.passed() : m.keep_practicing()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{quizResult.feedback}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuizResult(null)
                    setAnswers({})
                    fetchQuiz(true)
                  }}
                  disabled={isFetchingQuiz || !quizResult}
                >
                  {m.retry_quiz()}
                </Button>
                {quizResult ? (
                  <Button onClick={closeQuizModal}>{m.continue_to_next_slides()}</Button>
                ) : (
                  <Button onClick={submitQuiz}>{m.submit_quiz()}</Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
