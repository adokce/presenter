import { Loader2 } from "lucide-react"
import { useState } from "react"

interface PDFViewerProps {
  currentPage: number
}

export function PDFViewer({ currentPage }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true)

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  const handlePageChange = () => {
    setIsLoading(true)
  }

  return (
    <div className="relative w-full h-full bg-background">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        key={currentPage}
        src={`/api/pdf-page?page=${currentPage}#page=${currentPage}`}
        className="w-full h-full"
        title={`Presentation page ${currentPage}`}
        onLoad={handleIframeLoad}
        onLoadStart={handlePageChange}
      />
    </div>
  )
}
