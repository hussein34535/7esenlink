'use client'

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
import { Loader2, Plus, Edit, Trash2, Eye, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface LinkItem {
  id: number
  name: string
  original: string
  status?: "online" | "offline" | "checking"
  lastChecked?: string
  category?: string
  converted?: string
  createdAt?: string
}

export default function DashboardPage() {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newLinkInput, setNewLinkInput] = useState({ name: "", url: "" })
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  // Load links on component mount
  useEffect(() => {
    loadLinks()
  }, [])

  const loadLinks = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/links")
      if (!response.ok) throw new Error("Failed to load links")
      const data = await response.json()
      const linksWithNumericIds = (data.links || []).map((link: any) => ({
        ...link,
        id: Number(link.id)
      }));
      setLinks(linksWithNumericIds)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load links")
      toast.error("Failed to load links")
    } finally {
      setLoading(false)
    }
  }

  const addLink = async () => {
    try {
      setIsAdding(true)
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newLinkInput.name, 
          original: newLinkInput.url, 
          category: 'Uncategorized' 
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add link")
      }

      const addedLinkResponse = await response.json()
      const addedLink = { ...addedLinkResponse, id: Number(addedLinkResponse.id) };
      setLinks([...links, addedLink])
      setNewLinkInput({ name: "", url: "" })
      toast.success("Link added successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add link")
    } finally {
      setIsAdding(false)
    }
  }

  const updateLink = async () => {
    if (!editingLink) return

    toast.info("Update functionality is not yet implemented for /api/links.");
    setIsEditing(false); 
    setEditingLink(null);
  }

  const deleteLink = async (id: number) => {
    if (!confirm("Are you sure you want to delete this link?")) return

    try {
      const response = await fetch(`/api/links`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete link")
      }

      setLinks(links.filter((link) => link.id !== id))
      toast.success("Link deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete link")
    }
  }

  const checkLinkStatus = async (link: LinkItem) => {
    try {
      setIsCheckingStatus(true)
      const streamUrl = `/api/stream/${link.category?.toLowerCase() || 'uncategorized'}/${link.id}`;
      const response = await fetch(streamUrl);
      const isOnline = response.ok
      
      setLinks(links.map((l: LinkItem) => 
        l.id === link.id 
          ? { ...l, status: isOnline ? "online" : "offline", lastChecked: new Date().toISOString() }
          : l
      ))
      
      toast.info(`Link status: ${isOnline ? "online" : "offline"}`)
    } catch (err) {
      setLinks(links.map((l: LinkItem) => 
        l.id === link.id 
          ? { ...l, status: "offline", lastChecked: new Date().toISOString() }
          : l
      ))
      toast.error("Failed to check link status")
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const filteredLinks = links.filter(
    (link) =>
      link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.original.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Link Dashboard</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Link Name"
                  value={newLinkInput.name}
                  onChange={(e) =>
                    setNewLinkInput({ ...newLinkInput, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Stream URL"
                  value={newLinkInput.url}
                  onChange={(e) =>
                    setNewLinkInput({ ...newLinkInput, url: e.target.value })
                  }
                />
                <Button
                  onClick={addLink}
                  disabled={isAdding || !newLinkInput.name || !newLinkInput.url}
                  className="w-full"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Link"
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
                  <TableHead>Stream URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>{link.name}</TableCell>
                    <TableCell className="max-w-xs truncate" title={link.original}>{link.original}</TableCell> 
                    <TableCell>
                      {link.status === 'checking' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : link.status ? (
                        <Badge variant={link.status === 'online' ? 'default' : 'destructive'}>
                          {link.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unknown</Badge>
                      )}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => checkLinkStatus(link)}
                        disabled={isCheckingStatus}
                        title="Check Status"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => setEditingLink(link)}
                            title="Edit Link"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Link</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Input
                              placeholder="Link Name"
                              value={editingLink?.name || ''}
                              onChange={(e) => 
                                setEditingLink(prev => prev ? {...prev, name: e.target.value} : null)
                              }
                            />
                            <Input
                              placeholder="Stream URL"
                              value={editingLink?.original || ''}
                              onChange={(e) => 
                                setEditingLink(prev => prev ? {...prev, original: e.target.value} : null)
                              }
                            />
                            <Button 
                              onClick={updateLink}
                              disabled={isEditing}
                              className="w-full"
                            >
                              {isEditing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </> 
                              ) : (
                                "Update Link"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteLink(link.id)}
                        title="Delete Link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 