import { useState, lazy, Suspense } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { getUser } from "@/functions/get-user"

const PDFGallery = lazy(() => import("@/components/pdf-gallery"))

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
  const { session } = Route.useRouteContext()
  const [pageNumber, setPageNumber] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [extractedText, setExtractedText] = useState("")

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Webinar</h1>
            <p className="text-muted-foreground mt-1">
              Welcome, {session?.user.name}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {numPages > 0 && (
              <span>
                Slide {pageNumber} of {numPages}
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
            onPageChange={setPageNumber}
            onNumPagesChange={setNumPages}
            onTextExtracted={setExtractedText}
          />
        </Suspense>
      </div>
    </div>
  )
}

