"use client"

import { useState, useEffect, useRef } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronLeft, ChevronRight, Volume2, Loader2, Play, Pause } from "lucide-react"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { m } from "@/paraglide/messages"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFGalleryProps {
  file: string
  pageNumber: number
  onPageChange: (page: number) => void
  onNumPagesChange: (numPages: number) => void
  onTextExtracted: (page: number, text: string) => void
}

export default function PDFGallery({
  file,
  pageNumber,
  onPageChange,
  onNumPagesChange,
  onTextExtracted,
}: PDFGalleryProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [containerWidth, setContainerWidth] = useState<number>(800)
  
  // Script generation state
  const [scripts, setScripts] = useState<Record<number, string>>({})
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({})
  const [isLoadingScript, setIsLoadingScript] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const [currentText, setCurrentText] = useState("")
  const [extractedTexts, setExtractedTexts] = useState<Record<number, string>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const updateWidth = () => {
      setContainerWidth(Math.min(window.innerWidth - 400, 900))
    }
    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  // Generate script when page changes and we have text
  useEffect(() => {
    // Create abort controller for this effect
    const abortController = new AbortController()
    let isCancelled = false

    const generateScript = async () => {
      console.log("[PDFGallery] generateScript called for page", pageNumber)
      console.log("[PDFGallery] currentText:", currentText?.substring(0, 100))
      console.log("[PDFGallery] numPages:", numPages)
      
      // Check if we already have script and audio for this page
      if (scripts[pageNumber] && audioUrls[pageNumber]) {
        console.log("[PDFGallery] Using cached script and audio")
        if (!isCancelled) {
          playAudio(audioUrls[pageNumber])
        }
        return
      }

      // Need text content and numPages to generate
      if (!currentText || numPages === 0) {
        console.log("[PDFGallery] Waiting for text content or numPages")
        return
      }

      setIsLoadingScript(true)
      console.log("[PDFGallery] Calling /api/generate-script/...")

      try {
        // Get previous and next slide text for context
        const previousText = pageNumber > 1 ? extractedTexts[pageNumber - 1] : undefined
        const nextText = pageNumber < numPages ? extractedTexts[pageNumber + 1] : undefined

        console.log("[PDFGallery] Context available:", {
          hasPrevious: !!previousText,
          hasNext: !!nextText
        })

        const response = await fetch("/api/generate-script/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pdfId: file,
            pageNumber: pageNumber,
            totalPages: numPages,
            textContent: currentText,
            previousText,
            nextText,
          }),
          signal: abortController.signal, // Add abort signal
        })

        // Check if effect was cancelled while we were fetching
        if (isCancelled) {
          console.log("[PDFGallery] Request completed but effect was cancelled")
          return
        }

        console.log("[PDFGallery] Response status:", response.status)
        const data = await response.json()
        console.log("[PDFGallery] Response data:", data)

        if (data.script) {
          console.log("[PDFGallery] Script received:", data.script.substring(0, 100))
          setScripts((prev) => ({ ...prev, [pageNumber]: data.script }))

          if (data.audioUrl) {
            console.log("[PDFGallery] Audio URL received:", data.audioUrl)
            setAudioUrls((prev) => ({ ...prev, [pageNumber]: data.audioUrl }))
            // Only play if not cancelled
            if (!isCancelled) {
              playAudio(data.audioUrl)
            }
          }
        } else {
          console.error("[PDFGallery] No script in response:", data)
        }
      } catch (error) {
        // Don't log abort errors - they're expected
        if (error instanceof Error && error.name === 'AbortError') {
          console.log("[PDFGallery] Request aborted for page", pageNumber)
          return
        }
        console.error("[PDFGallery] Error generating script:", error)
      } finally {
        if (!isCancelled) {
          setIsLoadingScript(false)
        }
      }
    }

    if (numPages > 0 && currentText) {
      generateScript()
    }

    // Cleanup function - runs when pageNumber changes or component unmounts
    return () => {
      isCancelled = true
      abortController.abort()
    }
  }, [pageNumber, currentText, numPages, extractedTexts])

  const playAudio = (url: string) => {
    console.log("[PDFGallery] playAudio called with:", url)
    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(url)
    audioRef.current = audio

    audio.onplay = () => {
      console.log("[PDFGallery] Audio started playing")
      setIsSpeaking(true)
    }
    audio.onended = () => {
      console.log("[PDFGallery] Audio ended")
      setIsSpeaking(false)
    }
    audio.onerror = (e) => {
      console.error("[PDFGallery] Audio error:", e)
      setIsSpeaking(false)
    }
    audio.onpause = () => setIsSpeaking(false)

    audio.play().catch((err) => console.error("[PDFGallery] Audio play error:", err))
  }

  

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isSpeaking) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    } else if (audioUrls[pageNumber]) {
      playAudio(audioUrls[pageNumber])
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    onNumPagesChange(numPages)
  }

  function goToPrevPage() {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsSpeaking(false)
    const newPage = Math.max(pageNumber - 1, 1)
    onPageChange(newPage)
  }

  function goToNextPage() {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsSpeaking(false)
    const newPage = Math.min(pageNumber + 1, numPages)
    onPageChange(newPage)
  }

  // Extract text when page renders
  async function onPageRenderSuccess() {
    try {
      console.log("[PDFGallery] onPageRenderSuccess for page", pageNumber)
      const pdf = await pdfjs.getDocument(file).promise
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const text = textContent.items.map((item: any) => item.str).join(" ")
      console.log("[PDFGallery] Extracted text:", text.substring(0, 100))
      setCurrentText(text)
      setExtractedTexts(prev => ({ ...prev, [pageNumber]: text }))
      onTextExtracted(pageNumber, text)

      // Pre-extract adjacent slides for context
      const adjacentPages = []
      if (pageNumber > 1 && !extractedTexts[pageNumber - 1]) {
        adjacentPages.push(pageNumber - 1)
      }
      if (pageNumber < numPages && !extractedTexts[pageNumber + 1]) {
        adjacentPages.push(pageNumber + 1)
      }

      for (const adjacentPage of adjacentPages) {
        try {
          const adjPage = await pdf.getPage(adjacentPage)
          const adjTextContent = await adjPage.getTextContent()
          const adjText = adjTextContent.items.map((item: any) => item.str).join(" ")
          setExtractedTexts(prev => ({ ...prev, [adjacentPage]: adjText }))
          console.log(`[PDFGallery] Pre-extracted text for page ${adjacentPage}`)
        } catch (error) {
          console.error(`[PDFGallery] Error pre-extracting page ${adjacentPage}:`, error)
        }
      }
    } catch (error) {
      console.error("[PDFGallery] Error extracting text:", error)
    }
  }

  return (
    <div className="flex h-full">
      {/* Main PDF View */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex justify-center items-center bg-muted/30 p-4 overflow-auto relative">
          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full border border-primary/30">
              <Volume2 className="h-4 w-4 text-primary" />
              <div className="flex items-center gap-1">
                <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
                <div className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                <div className="w-1 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            }
            error={
              <div className="text-center py-20">
                <p className="text-destructive text-lg font-medium">{m.pdf_load_failed_title()}</p>
                <p className="text-muted-foreground mt-2">{m.pdf_load_failed_hint()}</p>
              </div>
            }
          >
            <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
              <Page
                pageNumber={pageNumber}
                width={containerWidth}
                onRenderSuccess={onPageRenderSuccess}
                loading={
                  <div className="flex items-center justify-center py-20" style={{ width: containerWidth, height: 600 }}>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                }
              />
            </div>
          </Document>
        </div>

        <div className="bg-background border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium
                       hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
                       transition-colors duration-200"
            >
              <ChevronLeft size={20} />
              {m.previous()}
            </button>

            <div className="flex items-center gap-4">
              {/* Audio controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayPause}
                  disabled={!audioUrls[pageNumber] && !isLoadingScript}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={isSpeaking ? m.pause() : m.play()}
                >
                  {isSpeaking ? <Pause size={18} /> : <Play size={18} />}
                </button>
                {/* <button
                  onClick={toggleMute}
                  className={`p-2 rounded-lg transition-colors ${isMuted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button> */}
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNumber}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    if (value >= 1 && value <= numPages) {
                      if (audioRef.current) audioRef.current.pause()
                      setIsSpeaking(false)
                      onPageChange(value)
                    }
                  }}
                  className="w-16 px-3 py-2 border rounded-lg text-center font-medium
                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <span className="text-muted-foreground font-medium">/ {numPages}</span>
              </div>
            </div>

            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium
                       hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
                       transition-colors duration-200"
            >
              {m.next()}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Script Panel */}
      <div className="w-80 border-l bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {m.ai_speaker_script()}
          </h3>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          {isLoadingScript ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>{m.generating_script()}</span>
            </div>
          ) : scripts[pageNumber] ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">{scripts[pageNumber]}</p>
              <div className="pt-3 border-t text-xs text-muted-foreground">
                {isSpeaking ? m.speaking() : m.click_play_to_hear()}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {m.script_generated_on_load()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
