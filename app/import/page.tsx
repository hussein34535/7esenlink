"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ConvertedLink {
  id: number
  name: string
  original: string
  converted: string
  category: string
  createdAt: string
}

export default function ImportPage() { // Renamed from Home to ImportPage
  const [m3uFile, setM3uFile] = useState<File | null>(null)
  const [m3uUrl, setM3uUrl] = useState("")
  const [m3uContent, setM3uContent] = useState("")
  const [manualName, setManualName] = useState("")
  const [manualUrl, setManualUrl] = useState("")
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })
  const [convertedLinks, setConvertedLinks] = useState<ConvertedLink[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('Uncategorized')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchRecentLinks()
    fetchCategories()
  }, [])

  const fetchRecentLinks = async () => {
    try {
      const response = await fetch('/api/links')
      if (response.ok) {
        const data = await response.json()
        setConvertedLinks((data.links || []).slice(0, 5))
      } else {
        console.error('Failed to fetch recent links')
      }
    } catch (error) {
      console.error('Error fetching recent links:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/links/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data || [])
      } else {
        console.error('Failed to fetch categories')
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setM3uFile(event.target.files[0])
      setM3uUrl("")
      setM3uContent("")
    }
  }

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setM3uUrl(event.target.value)
    setM3uFile(null)
    setM3uContent("")
  }

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setM3uContent(event.target.value)
    setM3uFile(null)
    setM3uUrl("")
  }

  const handleM3uSubmit = async () => {
    if (!m3uFile && !m3uUrl && !m3uContent) {
      toast.error('Please select a file, enter a URL, or paste M3U content.')
      return
    }
    setIsLoading(true)
    setStatus({ type: null, message: '' })

    const formData = new FormData()
    if (m3uFile) {
      formData.append('m3uFile', m3uFile)
    } else if (m3uUrl) {
      formData.append('m3uUrl', m3uUrl)
    } else if (m3uContent) {
      formData.append('m3uContent', m3uContent)
    }
    formData.append('category', selectedCategory)

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (response.ok) {
        setStatus({ type: 'success', message: `Import successful! ${result.count} links added to category '${selectedCategory}'.` })
        setM3uFile(null)
        setM3uUrl("")
        setM3uContent("")
        fetchRecentLinks()
        const fileInput = document.getElementById('m3uFile') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Import failed',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddManualLink = async () => {
    if (!manualName || !manualUrl) {
      toast.error('Please enter both Channel Name and Original URL.')
      return
    }
    setIsLoading(true)
    setStatus({ type: null, message: '' })

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manualName,
          original: manualUrl,
          category: selectedCategory
        }),
      })

      if (response.ok) {
        const newLink = await response.json()
        toast.success(`Link '${newLink.name}' added successfully to category '${selectedCategory}'!`)
        setManualName("")
        setManualUrl("")
        fetchRecentLinks()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add link')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add link')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Link copied to clipboard')
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    toast.dismiss()

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original: manualUrl,
          name: manualName,
          category: selectedCategory || 'Uncategorized'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add link')
      }

      const newLink = await response.json()
      toast.success(`Link '${newLink.name}' added successfully to category '${selectedCategory}'!`)
      setManualName("")
      setManualUrl("")
      fetchRecentLinks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add link')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">IPTV Link Manager</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="categorySelect" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="categorySelect"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              disabled={isLoading}
            >
              <option value="Uncategorized">Uncategorized</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the category to add the links to.
            </p>
          </div>

          <div className="space-y-4 p-4 border rounded-md">
            <h3 className="text-lg font-medium">Import from M3U</h3>
            <div>
              <label htmlFor="m3uFile" className="block text-sm font-medium text-gray-700 mb-1">
                Upload M3U File
              </label>
              <Input
                id="m3uFile"
                type="file"
                accept=".m3u,.m3u8"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-500">Or</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div>
              <label htmlFor="m3uUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Enter M3U URL
              </label>
              <Input
                id="m3uUrl"
                type="url"
                placeholder="http://example.com/playlist.m3u"
                value={m3uUrl}
                onChange={handleUrlChange}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-500">Or</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div>
              <label htmlFor="m3uContent" className="block text-sm font-medium text-gray-700 mb-1">
                Paste M3U Content
              </label>
              <Textarea
                id="m3uContent"
                placeholder={`#EXTM3U\n#EXTINF:-1 tvg-id="channel1" tvg-name="Channel 1",Channel One\nhttp://...`}
                rows={5}
                value={m3uContent}
                onChange={handleContentChange}
                className="font-mono text-sm"
                disabled={isLoading}
              />
            </div>

            <Button onClick={handleM3uSubmit} className="w-full" disabled={isLoading}>
              {isLoading ? "Importing..." : "Import M3U"}
            </Button>
          </div>

          <div className="space-y-4 p-4 border rounded-md">
            <h3 className="text-lg font-medium">Add Manually</h3>
            <div>
              <label htmlFor="manualName" className="block text-sm font-medium text-gray-700 mb-1">
                Channel Name
              </label>
              <Input
                id="manualName"
                type="text"
                placeholder="e.g., CNN HD"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="manualUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Original Stream URL
              </label>
              <Input
                id="manualUrl"
                type="url"
                placeholder="e.g., http://mydomain.com:8080/live/stream.ts"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                The URL the static link will redirect to.
              </p>
            </div>
            <div>
              <label htmlFor="manualCategorySelect" className="block text-sm font-medium text-gray-700 mb-1">
                Category (for this link)
              </label>
              <select
                id="manualCategorySelect"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                disabled={isLoading}
              >
                <option value="Uncategorized">Uncategorized</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleAddManualLink} className="w-full" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Manual Link"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {status.type && (
        <div
          className={`mb-6 p-4 rounded-md ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
        >
          {status.message}
        </div>
      )}

      <div className="mt-12">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Links</CardTitle>
              <Link href="/">
                <Button variant="link">View All Links</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {convertedLinks.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {convertedLinks.map((link) => (
                  <li key={link.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate" title={link.name}>{link.name}</p>
                        <p className="text-xs text-gray-500 truncate" title={link.original}>Original: {link.original}</p>
                        <p className="text-sm text-blue-600 truncate" title={link.converted}>Converted: {link.converted}</p>
                        <p className="text-xs text-gray-500 mt-1">Category: {link.category} | Added: {new Date(link.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(link.converted)}
                      >
                        Copy Static Link
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500">No recent links.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}