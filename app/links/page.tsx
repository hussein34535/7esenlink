"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// Removed Badge import as it wasn't used after the change
import { toast } from "sonner"
import { Loader2, Search, Copy, Trash2, Plus, X } from "lucide-react" // Removed ExternalLink
import Link from "next/link"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

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
  const [selectedLinks, setSelectedLinks] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [m3uContent, setM3uContent] = useState('')
  const [isActionLoading, setIsActionLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
        setBaseUrl(window.location.origin)
    }
    loadLinksAndCategories()
  }, [])

  const loadLinksAndCategories = async () => {
    setLoading(true)
    setError(null);
    try {
      const response = await fetch('/api/links')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load links data' }));
        throw new Error(errorData.details || errorData.error || 'Failed to load links data')
      }
      const data: LinksData = await response.json()
      setLinks(data.links || [])
      // Ensure 'Uncategorized' is always an option if needed, or rely on backend data
      const uniqueCategories = Array.from(new Set(['Uncategorized', ...(data.categories || [])]))
      // Filter out empty or null category names potentially coming from DB
      setCategories(uniqueCategories.filter(cat => cat && cat.trim() !== ''));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load links data';
      setError(message);
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty')
      return
    }
    setIsActionLoading(true);
    try {
      const response = await fetch('/api/links/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Failed to create category')
      }

      await loadLinksAndCategories() // Reload to get the updated list including the new one

      setNewCategory('');
      setShowNewCategoryInput(false);
      toast.success(`Category '${newCategory.trim()}' created successfully`);

    } catch (err) {
      console.error('Error creating category:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
        setIsActionLoading(false);
    }
  }

  // Delete Category function remains largely the same, ensure it updates state correctly
  const deleteCategory = async (category: string) => {
    if (!confirm(`Are you sure you want to delete the category "${category}"? Links in this category will be moved to "Uncategorized".`)) {
        return;
    }
    setIsActionLoading(true);
    try {
      const response = await fetch(`/api/links/categories/${encodeURIComponent(category)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to delete category')
      }

      // Optimistic UI update or reload
      await loadLinksAndCategories(); // Reloading is safer to ensure consistency
      // Manually update state if preferred (faster perceived response)
      // setCategories(categories.filter(c => c !== category))
      // setLinks(links.map(link =>
      //   link.category === category ? { ...link, category: 'Uncategorized' } : link
      // ))
      // If using manual update, ensure the filter dropdown is also updated
      if (selectedCategoryFilter === category) {
          setSelectedCategoryFilter('all'); // Reset filter if the deleted category was selected
      }

      toast.success(`Category "${category}" deleted successfully`);
    } catch (err) {
      console.error('Error deleting category:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setIsActionLoading(false);
    }
  }


  const updateLinkCategory = async (linkId: number, newCategory: string) => {
    setIsActionLoading(true);
    const originalLinks = [...links];
    // Optimistic update
    setLinks(prevLinks =>
        prevLinks.map(link =>
            link.id === linkId ? { ...link, category: newCategory } : link
        )
    );

    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: newCategory }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to update link category')
      }
      toast.success('Link category updated successfully')
      // Optional: reload data if backend logic might affect other things
      // await loadLinksAndCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update link category')
      setLinks(originalLinks); // Revert on error
    } finally {
        setIsActionLoading(false);
    }
  }

  const copyToClipboard = async (text: string) => {
    if (!text) {
      toast.error("Cannot copy empty URL");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard");
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast.error("Failed to copy link");
    }
  }

  const deleteLinks = async (compositeKeys: string[]) => {
    if (compositeKeys.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${compositeKeys.length} selected link(s)?`)) {
      return
    }
    setIsActionLoading(true);
    const originalLinks = [...links];
    const originalSelected = [...selectedLinks];

    // Optimistic update
    setLinks(prevLinks => prevLinks.filter(link => !compositeKeys.includes(`${link.category}-${link.id}`)));
    setSelectedLinks(prevSelected => prevSelected.filter(key => !compositeKeys.includes(key)));

    try {
      // Prepare the array of objects { id, category } for the backend
      const linksToDelete = compositeKeys.map(key => {
        const [categoryStr, idStr] = key.split('-');
        return { id: parseInt(idStr), category: categoryStr };
      });

      const response = await fetch('/api/links', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linksToDelete }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete links')
      }

      toast.success(`${compositeKeys.length} link(s) deleted successfully`)
      // No need to update state again if optimistic update was successful
    } catch (err) {
      console.error('Error deleting links:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete links')
      // Revert on error
      setLinks(originalLinks);
      setSelectedLinks(originalSelected);
    } finally {
      setIsActionLoading(false);
    }
  }

  const handleSelectLink = (compositeKey: string, checked: boolean | 'indeterminate') => {
    setSelectedLinks(prev =>
      checked === true
        ? [...prev, compositeKey]
        : prev.filter(selectedKey => selectedKey !== compositeKey)
    );
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedLinks(filteredLinks.map(link => `${link.category}-${link.id}`));
    } else {
      setSelectedLinks([]);
    }
  };

  const handleUpdateSelected = async () => {
    if (selectedLinks.length === 0) {
      toast.error('Please select at least one link to update')
      return
    }

    // Basic validation: Check if the number of lines (potential URLs) matches selected links
    const lines = m3uContent.trim().split('\n');
    const urlsInM3u = lines.filter(line => line.trim() && !line.trim().startsWith('#'));
    if (urlsInM3u.length !== selectedLinks.length) {
        toast.error(`Number of URLs in M3U content (${urlsInM3u.length}) does not match the number of selected links (${selectedLinks.length}).`);
        return;
    }


    setIsActionLoading(true)
    try {
      const response = await fetch('/api/links/update-selected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkIds: selectedLinks,
          m3uContent // Send the raw M3U content
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update links' }))
        throw new Error(error.error || 'Failed to update links')
      }

      toast.success('Links updated successfully')
      setM3uContent('')
      setSelectedLinks([])
      setIsUpdateModalOpen(false)
      await loadLinksAndCategories() // Refresh data to show updated URLs
    } catch (error) {
      console.error('Error updating links:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update links')
    } finally {
      setIsActionLoading(false)
    }
  }

  const filteredLinks = links.filter(link => {
    const searchLower = searchQuery.toLowerCase();
    const fullConvertedUrl = baseUrl ? `${baseUrl}${link.converted}` : link.converted;
    const matchesSearch =
        (link.name && link.name.toLowerCase().includes(searchLower)) ||
        (link.original && link.original.toLowerCase().includes(searchLower)) ||
        (fullConvertedUrl && fullConvertedUrl.toLowerCase().includes(searchLower)) ||
        (link.category && link.category.toLowerCase().includes(searchLower));
    const matchesCategory = selectedCategoryFilter === 'all' || link.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isAllSelected = filteredLinks.length > 0 && selectedLinks.length === filteredLinks.length;
  const isSomeSelected = selectedLinks.length > 0 && selectedLinks.length < filteredLinks.length;
  const selectAllCheckedState = isAllSelected ? true : (isSomeSelected ? 'indeterminate' : false);

  // Define placeholder text outside JSX
  const m3uPlaceholder = `#EXTM3U
#EXTINF:-1 tvg-id="SomeChannel" tvg-name="Some Channel Name" group-title="News",Some Channel Name
http://example.com/stream1
#EXTINF:-1 tvg-id="AnotherID" tvg-name="Another Channel" group-title="Movies",Another Channel
http://example.com/stream2
#EXTINF:-1 tvg-id="ThirdID" tvg-name="Third Channel" group-title="Sports",Third Channel
http://example.com/stream3
...`;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Converted Links</h1>
        <Link href="/">
          <Button variant="outline">Back to Add Links</Button>
        </Link>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-grow w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, URL, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full md:w-[300px] lg:w-[400px]"
            aria-label="Search links"
          />
        </div>

        <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
          <SelectTrigger className="w-full md:w-[200px]" aria-label="Filter by category">
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
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-grow"
              disabled={isActionLoading}
              aria-label="New category name"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={createCategory}
              disabled={!newCategory.trim() || isActionLoading}
              title="Save Category"
            >
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setShowNewCategoryInput(false); setNewCategory(''); }}
              title="Cancel adding category"
              disabled={isActionLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowNewCategoryInput(true)}
            className="w-full md:w-auto"
            disabled={isActionLoading} // Disable if any action is loading
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Selected Actions Bar */}
          {selectedLinks.length > 0 && (
            <Card className="mb-6 border-primary/50 bg-primary/5">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSelectAll(false)} // Deselect all
                      title="Clear selection"
                      className="h-6 w-6"
                      aria-label="Clear selection"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-primary">
                        {selectedLinks.length} link{selectedLinks.length === 1 ? '' : 's'} selected
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsUpdateModalOpen(true)}
                      disabled={isActionLoading}
                    >
                    {/* Icon can be added here if desired, e.g., <Upload className="h-4 w-4 mr-2" /> */}
                    Update Selected URLs
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteLinks(selectedLinks)}
                      disabled={isActionLoading}
                    >
                    {isActionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Trash2 className="h-4 w-4 mr-2" />}
                    Delete Selected
                    </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links Table */}
          <Card>
             <CardContent className="p-0">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] px-4">
                       <Checkbox
                          checked={selectAllCheckedState}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all rows"
                        />
                    </TableHead>
                    <TableHead>Name / Category</TableHead>
                    <TableHead>Links</TableHead>
                    <TableHead className="text-right w-[100px] pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLinks.length > 0 ? (
                    filteredLinks.map((link) => {
                      const fullConvertedUrl = baseUrl ? `${baseUrl}${link.converted}` : link.converted;
                      const isSelected = selectedLinks.includes(`${link.category}-${link.id}`);
                      const createdDate = new Date(link.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      });
                      return (
                        <TableRow key={`${link.category}-${link.id}`} className={isSelected ? "bg-muted" : ""}>
                          <TableCell className="px-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectLink(`${link.category}-${link.id}`, checked)}
                              aria-label={`Select link ${link.name}`}
                            />
                          </TableCell>
                          <TableCell className="py-3 px-4 font-medium">
                             <div className="flex flex-col gap-2">
                               <span className="text-sm truncate" title={`${link.name}`}>
                                {link.name || "Unnamed Link"}
                               </span>
                               <Select 
                                 value={link.category || 'Uncategorized'} 
                                 onValueChange={(newCategory) => updateLinkCategory(link.id, newCategory)}
                                 disabled={isActionLoading}
                               >
                                 <SelectTrigger className="w-full h-8 text-xs mt-1">
                                   <SelectValue placeholder="Select category" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   {categories.map((category) => (
                                     <SelectItem key={category} value={category} className="text-xs">
                                       {category}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             </div>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-sm truncate flex-grow" title={link.original}>
                                  <span className="text-muted-foreground mr-1">Orig:</span>
                                  {link.original}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(link.original)}
                                    title="Copy original link"
                                    className="h-6 w-6 flex-shrink-0"
                                    disabled={!link.original}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                 <span className="text-sm truncate flex-grow" title={fullConvertedUrl}>
                                   <span className="text-muted-foreground mr-1">Static:</span>
                                   {fullConvertedUrl}
                                </span>
                                 <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(fullConvertedUrl)}
                                    title="Copy static link"
                                    className="h-6 w-6 flex-shrink-0"
                                    disabled={!fullConvertedUrl}
                                 >
                                    <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteLinks([`${link.category}-${link.id}`])}
                              title="Delete link"
                              className="w-fit h-auto p-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={isActionLoading}
                            >
                               {/* Show loader specific to this row if deleting just this one */}
                               {isActionLoading && selectedLinks.length === 1 && selectedLinks[0] === `${link.category}-${link.id}` ?
                                <Loader2 className="h-3 w-3 mr-1 animate-spin"/> :
                                <Trash2 className="h-3 w-3 mr-1" />}
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                            {searchQuery || selectedCategoryFilter !== 'all'
                                ? "No links found matching your criteria."
                                : "No links have been added yet."
                            }
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Update Selected Links Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
                <DialogTitle>Update {selectedLinks.length} Selected Link(s)</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Paste M3U content below. The system will extract URLs (lines not starting with '#')
                  and update the 'Original URL' for the selected links in their current displayed order.
                  Ensure the number of valid URL lines matches the {selectedLinks.length} selected link(s).
                  The name and other M3U tags will be ignored.
                </p>
                 <Textarea
                    id="m3uContent"
                    value={m3uContent}
                    onChange={(e) => setM3uContent(e.target.value)}
                    className="min-h-[200px] text-xs font-mono"
                    placeholder={m3uPlaceholder}
                    aria-label="M3U content for updating links"
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline" disabled={isActionLoading}>Cancel</Button>
                </DialogClose>
                <Button
                    onClick={handleUpdateSelected}
                    disabled={isActionLoading || !m3uContent.trim()}
                >
                    {isActionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                    Update Links
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}