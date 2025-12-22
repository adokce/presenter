"use client"

import { useState } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"

import PDFGallery from "@/components/pdf-gallery"
import { getUser } from "@/functions/get-user"

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
        <PDFGallery
          file="/presentation_demo.pdf"
          pageNumber={pageNumber}
          onPageChange={setPageNumber}
          onNumPagesChange={setNumPages}
          onTextExtracted={setExtractedText}
        />
      </div>
    </div>
  )
}

