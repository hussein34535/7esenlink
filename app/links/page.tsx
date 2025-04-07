"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Search, Copy, Trash2, Plus, X } from "lucide-react"
import Link from "next/link"

interface ConvertedLink {
  id: number
  name: string
  original: string
  converted: string
  category: string
  createdAt: string
}

interface LinksData {
  links: ConvertedLink[]
  categories: string[]
}

export default function LinksPage() {
  const [links, setLinks] = useState<ConvertedLink[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all")
  const [selectedLinks, setSelectedLinks] = useState<number[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [m3uContent, setM3uContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
        setBaseUrl(window.location.origin)
    }
    loadLinksAndCategories()
  }, [])

  const loadLinksAndCategories = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/links')
      if (!response.ok) {
        throw new Error('Failed to load links data')
      }
      const data: LinksData = await response.json()
      setLinks(data.links || [])
      setCategories(Array.from(new Set(data.categories || [])))
      setError(null)
    } catch (err) {
      setError('Failed to load links data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty')
      return
    }

    try {
      const response = await fetch('/api/links/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to create category')
      }

      const data = await response.json()
      setCategories([...categories, data.name])
      setNewCategory('')
      setShowNewCategoryInput(false)
      toast.success('Category created successfully')
    } catch (err) {
      toast.error('Failed to create category')
    }
  }

  const deleteCategory = async (category: string) => {
    try {
      const response = await fetch(`/api/links/categories/${encodeURIComponent(category)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete category')
      }

      setCategories(categories.filter(c => c !== category))
      setLinks(links.map(link => 
        link.category === category ? { ...link, category: 'Uncategorized' } : link
      ))
      toast.success('Category deleted successfully')
    } catch (err) {
      toast.error('Failed to delete category')
    }
  }

  const updateLinkCategory = async (linkId: number, newCategory: string) => {
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: newCategory }),
      })

      if (!response.ok) {
        throw new Error('Failed to update link category')
      }

      setLinks(links.map(link =>
        link.id === linkId ? { ...link, category: newCategory } : link
      ))
      toast.success('Link category updated successfully')
    } catch (err) {
      toast.error('Failed to update link category')
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

  const deleteLinks = async (ids: number[]) => {
    try {
      const response = await fetch('/api/links', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete links')
      }

      setLinks(links.filter(link => !ids.includes(link.id)))
      setSelectedLinks([])
      toast.success('Links deleted successfully')
    } catch (err) {
      toast.error('Failed to delete links')
    }
  }

  const toggleSelectLink = (id: number) => {
    setSelectedLinks(prev =>
      prev.includes(id)
        ? prev.filter(linkId => linkId !== id)
        : [...prev, id]
    )
  }

  const handleSelectLink = (linkId: number) => {
    setSelectedLinks(prev => 
      prev.includes(linkId) 
        ? prev.filter(id => id !== linkId)
        : [...prev, linkId]
    )
  }

  const handleSelectAll = () => {
    if (selectedLinks.length === links.length) {
      setSelectedLinks([])
    } else {
      setSelectedLinks(links.map(link => link.id))
    }
  }

  const handleUpdateSelected = async () => {
    if (selectedLinks.length === 0) {
      toast.error('Please select at least one link to update')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/links/update-selected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkIds: selectedLinks,
          m3uContent
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update links')
      }

      toast.success('Links updated successfully')
      setM3uContent('')
      setSelectedLinks([])
      setIsUpdateModalOpen(false)
      loadLinksAndCategories()
    } catch (error) {
      console.error('Error updating links:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update links')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedLinks.length === 0) {
      toast.error('Please select at least one link to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedLinks.length} selected links?`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/links', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedLinks }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete links')
      }

      toast.success('Links deleted successfully')
      setSelectedLinks([])
      loadLinksAndCategories()
    } catch (error) {
      console.error('Error deleting links:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete links')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLinks = links.filter(link => {
    const matchesSearch = 
        link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (baseUrl + link.converted).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategoryFilter === 'all' || link.category === selectedCategoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Converted Links</h1>
        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, URL, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showNewCategoryInput ? (
            <div className="flex gap-2">
              <Input
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-40"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={createCategory}
                disabled={!newCategory.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setShowNewCategoryInput(false)
                  setNewCategory('')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowNewCategoryInput(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          )}
          <Link href="/">
            <Button variant="outline">Back to Add Links</Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {selectedLinks.length > 0 && (
            <div className="mb-4 flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedLinks.length} link{selectedLinks.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUpdateModalOpen(true)}
                  disabled={selectedLinks.length === 0 || isLoading}
                >
                  Update Selected URLs
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedLinks.length === 0 || isLoading}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {filteredLinks.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p>No links found matching your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredLinks.map((link) => {
                const fullConvertedUrl = baseUrl + link.converted
                return (
                <Card key={link.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                         <Input
                            type="checkbox"
                            checked={selectedLinks.includes(link.id)}
                            onChange={() => handleSelectLink(link.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                         <p className="text-base font-semibold text-foreground truncate" title={link.name}>{link.name}</p>
                      </div>
                       <div className="flex-shrink-0 flex space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(fullConvertedUrl)} title="Copy static link">
                            <Copy className="h-4 w-4" />
                        </Button>
                         <Button variant="ghost" size="icon" onClick={() => deleteLinks([link.id])} title="Delete link">
                            <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Original URL</p>
                        <p className="mt-1 text-xs text-muted-foreground break-all">{link.original}</p>
                      </div>
                       <div>
                        <p className="text-xs font-medium text-muted-foreground">Static Link</p>
                        <p className="mt-1 text-sm text-primary break-all">{fullConvertedUrl}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Select value={link.category} onValueChange={(newCat) => updateLinkCategory(link.id, newCat)}>
                           <SelectTrigger className="h-7 text-xs w-[150px]">
                             <SelectValue placeholder="Category" />
                           </SelectTrigger>
                           <SelectContent>
                             {categories.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                           </SelectContent>
                         </Select>
                        <span className="text-xs text-muted-foreground">
                          Added: {new Date(link.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <a
                        href={fullConvertedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Test Link
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          )}
        </>
      )}

      {/* Update Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Update Selected Links
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Paste the M3U content below. The URLs will be used to update the selected links in order.
              Make sure the number of URLs in the M3U content matches the number of selected links.
            </p>
            <div className="mb-4">
              <label htmlFor="m3uContent" className="block text-sm font-medium text-gray-700">
                M3U Content
              </label>
              <textarea
                id="m3uContent"
                value={m3uContent}
                onChange={(e) => setM3uContent(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={10}
                placeholder="Paste M3U content here..."
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSelected}
                disabled={isLoading || !m3uContent}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Links'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 