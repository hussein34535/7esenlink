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

interface Channel {
  id: string
  name: string
  url: string
  status?: "online" | "offline" | "checking"
  lastChecked?: string
}

export default function DashboardPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newChannel, setNewChannel] = useState({ name: "", url: "" })
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  // Load channels on component mount
  useEffect(() => {
    loadChannels()
  }, [])

  const loadChannels = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/channels")
      if (!response.ok) throw new Error("Failed to load channels")
      const data = await response.json()
      setChannels(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels")
      toast.error("Failed to load channels")
    } finally {
      setLoading(false)
    }
  }

  const addChannel = async () => {
    try {
      setIsAdding(true)
      const response = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChannel),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to add channel")
      }

      const addedChannel = await response.json()
      setChannels([...channels, addedChannel])
      setNewChannel({ name: "", url: "" })
      toast.success("Channel added successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add channel")
    } finally {
      setIsAdding(false)
    }
  }

  const updateChannel = async () => {
    if (!editingChannel) return

    try {
      setIsEditing(true)
      const response = await fetch("/api/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingChannel),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update channel")
      }

      const updatedChannel = await response.json()
      setChannels(
        channels.map((c) => (c.id === updatedChannel.id ? updatedChannel : c))
      )
      setEditingChannel(null)
      toast.success("Channel updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update channel")
    } finally {
      setIsEditing(false)
    }
  }

  const deleteChannel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return

    try {
      const response = await fetch(`/api/channels?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete channel")
      }

      setChannels(channels.filter((c) => c.id !== id))
      toast.success("Channel deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete channel")
    }
  }

  const checkChannelStatus = async (channel: Channel) => {
    try {
      setIsCheckingStatus(true)
      const response = await fetch(`/api/stream/${channel.id}`)
      const isOnline = response.ok
      
      setChannels(channels.map(c => 
        c.id === channel.id 
          ? { ...c, status: isOnline ? "online" : "offline", lastChecked: new Date().toISOString() }
          : c
      ))
      
      toast.info(`Channel is ${isOnline ? "online" : "offline"}`)
    } catch (err) {
      setChannels(channels.map(c => 
        c.id === channel.id 
          ? { ...c, status: "offline", lastChecked: new Date().toISOString() }
          : c
      ))
      toast.error("Failed to check channel status")
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const filteredChannels = channels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Channel Dashboard</h1>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Channel Name"
                  value={newChannel.name}
                  onChange={(e) =>
                    setNewChannel({ ...newChannel, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Stream URL"
                  value={newChannel.url}
                  onChange={(e) =>
                    setNewChannel({ ...newChannel, url: e.target.value })
                  }
                />
                <Button
                  onClick={addChannel}
                  disabled={isAdding || !newChannel.name || !newChannel.url}
                  className="w-full"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Channel"
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
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Checked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChannels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {channel.url}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          channel.status === "online"
                            ? "default"
                            : channel.status === "offline"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {channel.status || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {channel.lastChecked
                        ? new Date(channel.lastChecked).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => checkChannelStatus(channel)}
                        disabled={isCheckingStatus}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingChannel(channel)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Channel</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Input
                              placeholder="Channel Name"
                              value={editingChannel?.name}
                              onChange={(e) =>
                                setEditingChannel({
                                  ...editingChannel!,
                                  name: e.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Stream URL"
                              value={editingChannel?.url}
                              onChange={(e) =>
                                setEditingChannel({
                                  ...editingChannel!,
                                  url: e.target.value,
                                })
                              }
                            />
                            <Button
                              onClick={updateChannel}
                              disabled={isEditing}
                              className="w-full"
                            >
                              {isEditing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                "Update Channel"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteChannel(channel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredChannels.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No channels found
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