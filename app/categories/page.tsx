"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Search, GripVertical, ChevronUp, ChevronDown, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Category {
  id: string
  name: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/categories")
      if (!response.ok) throw new Error("Failed to load")
      const data = await response.json()
      setCategories(data)
    } catch {
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newList = [...categories]
    ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
    setCategories(newList)
    setHasChanges(true)
  }

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return
    const newList = [...categories]
    ;[newList[index + 1], newList[index]] = [newList[index], newList[index + 1]]
    setCategories(newList)
    setHasChanges(true)
  }

  const handleDragStart = (index: number) => setDraggedIndex(index)

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return
    const newList = [...categories]
    const [moved] = newList.splice(draggedIndex, 1)
    newList.splice(targetIndex, 0, moved)
    setCategories(newList)
    setDraggedIndex(null)
    setHasChanges(true)
  }

  const saveOrder = async () => {
    try {
      setIsSaving(true)
      const response = await fetch("/api/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: categories.map(c => c.id) }),
      })
      if (!response.ok) throw new Error("Failed")
      toast.success("تم حفظ الترتيب")
      setHasChanges(false)
    } catch {
      toast.error("Failed to save order")
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ترتيب الفئات</h1>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-48"
            />
          </div>
          {hasChanges && (
            <Button onClick={saveOrder} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              حفظ الترتيب
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((cat, index) => (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing transition-colors ${
                    draggedIndex === index ? "bg-accent opacity-50" : "hover:bg-muted/50"
                  }`}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground w-8 text-center">{index + 1}</span>
                  <Badge variant="outline" className="shrink-0">{cat.name}</Badge>
                  <div className="ml-auto flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="h-7 w-7"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveDown(index)}
                      disabled={index === filtered.length - 1}
                      className="h-7 w-7"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">لا توجد نتائج</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
