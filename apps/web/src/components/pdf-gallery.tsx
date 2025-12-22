"use client"

import { useState, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronLeft, ChevronRight } from "lucide-react"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFGalleryProps {
  file: string
  pageNumber: number
  onPageChange: (page: number) => void
  onNumPagesChange: (numPages: number) => void
  onTextExtracted: (text: string) => void
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

  useEffect(() => {
    const updateWidth = () => {
      setContainerWidth(Math.min(window.innerWidth - 400, 900))
    }
    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    onNumPagesChange(numPages)
  }

  function goToPrevPage() {
    const newPage = Math.max(pageNumber - 1, 1)
    onPageChange(newPage)
  }

  function goToNextPage() {
    const newPage = Math.min(pageNumber + 1, numPages)
    onPageChange(newPage)
  }

  // Extract text when page renders
  async function onPageRenderSuccess() {
    try {
      const pdf = await pdfjs.getDocument(file).promise
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const text = textContent.items.map((item: any) => item.str).join(" ")
      onTextExtracted(text)
    } catch (error) {
      console.error("Error extracting text:", error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex justify-center items-center bg-muted/30 p-4 overflow-auto">
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
              <p className="text-destructive text-lg font-medium">Failed to load PDF</p>
              <p className="text-muted-foreground mt-2">Please check if the file exists</p>
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
            Previous
          </button>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={(e) => {
                const value = Number(e.target.value)
                if (value >= 1 && value <= numPages) {
                  onPageChange(value)
                }
              }}
              className="w-16 px-3 py-2 border rounded-lg text-center font-medium
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <span className="text-muted-foreground font-medium">/ {numPages}</span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium
                     hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
                     transition-colors duration-200"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
