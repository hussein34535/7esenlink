"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, FileUp } from "lucide-react"

export default function ImportPage() {
  const [m3uContent, setM3uContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handlePasteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!m3uContent.trim()) {
      toast.error("M3U content cannot be empty")
      return
    }
    setIsLoading(true)

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: m3uContent }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || "Failed to process M3U content")
      }

      const result = await response.json()
      toast.success(`Successfully imported ${result.count} channels`)
      router.push("/")
    } catch (error) {
      console.error("Error processing M3U:", error)
      toast.error(`Failed to process M3U: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Import M3U Content</CardTitle>
            <CardDescription>
              Paste your M3U content below to import channels. Each line should contain either a channel name or URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div className="grid w-full gap-1.5">
                <Textarea
                  placeholder="Paste your M3U content here..."
                  value={m3uContent}
                  onChange={(e) => setM3uContent(e.target.value)}
                  disabled={isLoading}
                  className="min-h-[300px]"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import Channels
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 