"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2, Plus, Edit, Trash2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ColorPicker } from "@/components/ui/color-picker"

interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState<Partial<Category>>({})
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/categories")
      if (!response.ok) throw new Error("Failed to load categories")
      const data = await response.json()
      setCategories(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories")
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async () => {
    try {
      setIsAdding(true)
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add category")
      }

      const addedCategory = await response.json()
      setCategories([...categories, addedCategory])
      setNewCategory({})
      toast.success("Category added successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add category")
    } finally {
      setIsAdding(false)
    }
  }

  const updateCategory = async () => {
    if (!editingCategory) return

    try {
      setIsEditing(true)
      const response = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategory),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update category")
      }

      const updatedCategory = await response.json()
      setCategories(
        categories.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
      )
      setEditingCategory(null)
      toast.success("Category updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update category")
    } finally {
      setIsEditing(false)
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return

    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete category")
      }

      setCategories(categories.filter((c) => c.id !== id))
      toast.success("Category deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category")
    }
  }

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Categories</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Category Name"
                  value={newCategory.name || ""}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Description (optional)"
                  value={newCategory.description || ""}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, description: e.target.value })
                  }
                />
                <Input
                  placeholder="Icon (optional)"
                  value={newCategory.icon || ""}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, icon: e.target.value })
                  }
                />
                <div className="flex items-center gap-2">
                  <span>Color:</span>
                  <ColorPicker
                    value={newCategory.color || "#000000"}
                    onChange={(color) =>
                      setNewCategory({ ...newCategory, color })
                    }
                  />
                </div>
                <Button
                  onClick={addCategory}
                  disabled={isAdding || !newCategory.name}
                  className="w-full"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Category"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {category.icon && (
                          <span className="text-xl">{category.icon}</span>
                        )}
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell>{category.description || "-"}</TableCell>
                    <TableCell>
                      {category.color && (
                        <Badge
                          style={{ backgroundColor: category.color }}
                          className="text-white"
                        >
                          {category.color}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Category</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Input
                              placeholder="Category Name"
                              value={editingCategory?.name}
                              onChange={(e) =>
                                setEditingCategory({
                                  ...editingCategory!,
                                  name: e.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Description"
                              value={editingCategory?.description}
                              onChange={(e) =>
                                setEditingCategory({
                                  ...editingCategory!,
                                  description: e.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Icon"
                              value={editingCategory?.icon}
                              onChange={(e) =>
                                setEditingCategory({
                                  ...editingCategory!,
                                  icon: e.target.value,
                                })
                              }
                            />
                            <div className="flex items-center gap-2">
                              <span>Color:</span>
                              <ColorPicker
                                value={editingCategory?.color || "#000000"}
                                onChange={(color) =>
                                  setEditingCategory({
                                    ...editingCategory!,
                                    color,
                                  })
                                }
                              />
                            </div>
                            <Button
                              onClick={updateCategory}
                              disabled={isEditing}
                              className="w-full"
                            >
                              {isEditing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                "Update Category"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCategories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No categories found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 