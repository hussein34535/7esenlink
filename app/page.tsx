"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// Removed Badge import as it wasn't used after the change
import { toast } from "sonner"
import { Loader2, Search, Copy, Trash2, Plus, X, Edit2, ArrowUp, ArrowDown, Save, Pen, PlayCircle } from "lucide-react"
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

export default function Home() {
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
    const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false)
    const [playingUrl, setPlayingUrl] = useState<string | null>(null)

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
            // Normalize category to lowercase when loading links
            const normalizedLinks = (data.links || []).map(link => ({
                ...link,
                category: link.category.toLowerCase()
            }));
            setLinks(normalizedLinks);
            // Ensure 'Uncategorized' is always an option if needed, or rely on backend data
            const uniqueCategories = Array.from(new Set(['uncategorized', ...(data.categories || []).map(cat => cat.toLowerCase())])) // Also normalize categories list
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


    const updateLinkCategory = async (linkId: number, originalCategory: string, newCategory: string) => {
        setIsActionLoading(true);
        const originalLinks = [...links];
        // Optimistic update
        setLinks(prevLinks =>
            prevLinks.map(link =>
                link.id === linkId && link.category === originalCategory // Match by both ID and original category
                    ? { ...link, category: newCategory, converted: `/api/stream/${newCategory.toLowerCase()}/${link.id}` } // Update converted URL
                    : link
            )
        );

        try {
            const response = await fetch(`/api/links/${linkId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ originalCategory, newCategory }), // Pass originalCategory and newCategory
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
            toast.success("تم النسخ بنجاح");
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

    // State for Find & Replace Bar
    const [replaceCategory, setReplaceCategory] = useState("all")
    const [showFindReplace, setShowFindReplace] = useState(false)
    const [findText, setFindText] = useState("")
    const [replaceText, setReplaceText] = useState("")

    const handleNameChange = (id: number, newName: string) => {
        setLinks(prev => prev.map(l => l.id === id ? { ...l, name: newName } : l))
    }

    const handleNameBlur = async (id: number, newName: string) => {
        // Save on blur
        try {
            const response = await fetch(`/api/links/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName }), // Assuming API supports patch name
            })
            if (!response.ok) throw new Error('Failed to update name')
            toast.success('Name updated')
        } catch (error) {
            toast.error('Failed to save name')
        }
    }

    // Reuse handleReplace but adapt for the bar
    const handleQuickReplace = async () => {
        if (!findText) {
            toast.error('Find text is required')
            return
        }

        // Use the main toolbar category filter
        const targetCategory = selectedCategoryFilter;

        if (!confirm(`Replace "${findText}" with "${replaceText}" in ${targetCategory === 'all' ? 'ALL' : targetCategory} links?`)) {
            return;
        }

        setIsActionLoading(true)
        try {
            const response = await fetch('/api/links/replace', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ findText, replaceText, category: targetCategory }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to replace text')
            }

            toast.success(data.message || 'Links updated successfully')
            setFindText('')
            setReplaceText('')
            await loadLinksAndCategories()
        } catch (error) {
            console.error('Error replacing text:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to replace text')
        } finally {
            setIsActionLoading(false)
        }
    }

    // State for Category Management
    const [editingCategory, setEditingCategory] = useState<string | null>(null)
    const [editCategoryName, setEditCategoryName] = useState("")

    const startEditingCategory = (category: string) => {
        setEditingCategory(category)
        setEditCategoryName(category)
    }

    const handleRenameCategory = async (oldName: string) => {
        if (!editCategoryName.trim() || editCategoryName === oldName) {
            setEditingCategory(null)
            return
        }
        setIsActionLoading(true)
        try {
            const response = await fetch('/api/links/categories/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName, newName: editCategoryName })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to rename')
            }

            toast.success('Category renamed')
            setEditingCategory(null)
            await loadLinksAndCategories()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to rename category')
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
        if (isActionLoading) return

        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= categories.length) return

        const newCategories = [...categories]
        const temp = newCategories[index]
        newCategories[index] = newCategories[newIndex]
        newCategories[newIndex] = temp

        setCategories(newCategories) // Optimistic update

        try {
            const response = await fetch('/api/links/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCategories)
            })
            if (!response.ok) throw new Error('Failed to save order')
        } catch (e) {
            toast.error('Failed to save order')
            await loadLinksAndCategories() // Revert
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Converted Links</h1>
                <div className="flex gap-2">
                    {/* Save button removed to match HTML request 100% */}
                    <Link href="/import">
                        <Button variant="outline">Import New Links</Button>
                    </Link>
                </div>
            </div>

            {/* Toolbar Area */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                {/* Search */}
                <div className="relative flex-grow w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search name, URL, category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full md:w-[300px] lg:w-[400px] bg-background"
                    />
                </div>

                {/* Category Filter */}
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[200px] bg-background">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Actions Group */}
                <div className="flex gap-2 w-full md:w-auto">
                    {selectedLinks.length > 0 && (
                        <Button onClick={() => setIsUpdateModalOpen(true)} disabled={isActionLoading}>
                            <Save className="h-4 w-4 mr-2" />
                            Update ({selectedLinks.length})
                        </Button>
                    )}
                    {/* Add Category */}
                    {!showNewCategoryInput ? (
                        <Button variant="outline" onClick={() => setShowNewCategoryInput(true)} className="bg-background flex-grow">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Category
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 flex-grow">
                            <Input
                                placeholder="New Cat..."
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                className="w-[150px] h-9"
                            />
                            <Button size="sm" onClick={createCategory} disabled={isActionLoading}>Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowNewCategoryInput(false)}><X className="h-4 w-4" /></Button>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        className="bg-background flex-grow"
                        onClick={() => setIsManageCategoriesModalOpen(true)}
                        disabled={isActionLoading}
                    >
                        Manage Categories
                    </Button>

                    <Button
                        variant={showFindReplace ? "secondary" : "outline"}
                        className={`bg-background flex-grow ${showFindReplace ? "text-secondary-foreground hover:bg-secondary/80" : ""}`}
                        onClick={() => setShowFindReplace(!showFindReplace)}
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Find & Replace
                    </Button>
                </div>
            </div>

            {/* Collapsible Find & Replace Panel */}
            {showFindReplace && (
                <div className="bg-muted/40 rounded-lg p-4 border border-border/50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-1.5 flex-grow">
                            <label className="text-xs font-semibold text-muted-foreground">Find</label>
                            <Input
                                placeholder="Text to find..."
                                value={findText}
                                onChange={e => setFindText(e.target.value)}
                                className="bg-background h-9"
                            />
                        </div>
                        <div className="space-y-1.5 flex-grow">
                            <label className="text-xs font-semibold text-muted-foreground">Replace with</label>
                            <Input
                                placeholder="Replacement..."
                                value={replaceText}
                                onChange={e => setReplaceText(e.target.value)}
                                className="bg-background h-9"
                            />
                        </div>
                        {/* Category selector removed as requested */}
                        <Button onClick={handleQuickReplace} disabled={isActionLoading || !findText} className="h-9 shrink-0">
                            {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace All"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <Card className="border-destructive bg-destructive/10">
                    <CardContent className="pt-6">
                        <p className="text-destructive font-medium">Error: {error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Links Table */}
            {loading ? (
                <div className="flex justify-center h-64 items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px] px-4">
                                        <Checkbox
                                            checked={selectAllCheckedState}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[250px]">Name / Category</TableHead>
                                    <TableHead className="pl-0">Links</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLinks.length > 0 ? (
                                    filteredLinks.map((link) => {
                                        const fullConvertedUrl = baseUrl ? `${baseUrl}${link.converted}` : link.converted;
                                        const isSelected = selectedLinks.includes(`${link.category}-${link.id}`);

                                        return (
                                            <TableRow key={`${link.category}-${link.id}`} className={isSelected ? "bg-muted" : ""}>
                                                <TableCell className="px-4">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => handleSelectLink(`${link.category}-${link.id}`, checked)}
                                                    />
                                                </TableCell>
                                                <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 py-3 px-4 font-medium">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-sm truncate max-w-[200px]" title={link.name}>{link.name}</span>
                                                            <button
                                                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-6 w-6 flex-shrink-0"
                                                                title="Edit name"
                                                                onClick={() => {
                                                                    const newName = prompt("Edit name:", link.name);
                                                                    if (newName && newName !== link.name) handleNameBlur(link.id, newName);
                                                                }}
                                                            >
                                                                <Pen className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                        <Select
                                                            value={link.category}
                                                            onValueChange={(newCategory) => updateLinkCategory(link.id, link.category, newCategory)}
                                                            disabled={isActionLoading}
                                                        >
                                                            <SelectTrigger className="w-[140px] h-8 text-xs bg-background border border-input">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {categories.map((category) => (
                                                                    <SelectItem key={category} value={category}>
                                                                        {category}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-middle py-3 pr-4 pl-0">
                                                    <div className="flex flex-col gap-1">
                                                        {/* Original Link */}
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="text-sm text-foreground flex-1 break-all cursor-pointer hover:text-muted-foreground transition-colors"
                                                                title="Click to copy"
                                                                onClick={() => copyToClipboard(link.original)}
                                                            >
                                                                <span className="text-muted-foreground mr-1">Orig:</span>
                                                                {link.original}
                                                            </span>
                                                            <div className="flex gap-1 shrink-0">
                                                                <button
                                                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-7 w-7"
                                                                    title="Play original link"
                                                                    onClick={() => setPlayingUrl(link.original)}
                                                                >
                                                                    <PlayCircle className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {/* Static Link */}
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="text-sm text-foreground flex-1 break-all cursor-pointer hover:text-muted-foreground transition-colors"
                                                                title="Click to copy"
                                                                onClick={() => copyToClipboard(fullConvertedUrl)}
                                                            >
                                                                <span className="text-muted-foreground mr-1">Static:</span>
                                                                {fullConvertedUrl}
                                                            </span>
                                                            <div className="flex gap-1 shrink-0">
                                                                <button
                                                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-7 w-7"
                                                                    title="Play static link"
                                                                    onClick={() => setPlayingUrl(fullConvertedUrl)}
                                                                >
                                                                    <PlayCircle className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => deleteLinks([`${link.category}-${link.id}`])}
                                                        className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Delete
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No links found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Keep existing modals (Manage Categories, Update Selected) */}
            <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Update Selected</DialogTitle></DialogHeader>
                    <Textarea value={m3uContent} onChange={e => setM3uContent(e.target.value)} rows={5} placeholder="#EXTM3U..." />
                    <DialogFooter>
                        <Button onClick={handleUpdateSelected} disabled={isActionLoading}>Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isManageCategoriesModalOpen} onOpenChange={setIsManageCategoriesModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manage Categories</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                        {/* Simple list with delete for now, maybe add rename here later if needed */}
                        {categories.filter(c => c !== 'uncategorized').map((cat, index) => (
                            <div key={cat} className="flex flex-col gap-2 p-2 border rounded">
                                {editingCategory === cat ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={editCategoryName}
                                            onChange={(e) => setEditCategoryName(e.target.value)}
                                            className="h-8"
                                        />
                                        <Button size="sm" onClick={() => handleRenameCategory(cat)} disabled={isActionLoading}>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>Cancel</Button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center group">
                                        <span className="font-medium text-sm">{cat}</span>
                                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost" size="icon" className="h-7 w-7"
                                                onClick={() => handleMoveCategory(index, 'up')}
                                                disabled={index === 0 || isActionLoading}
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon" className="h-7 w-7"
                                                onClick={() => handleMoveCategory(index, 'down')}
                                                disabled={index === categories.length - 1 || isActionLoading}
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditingCategory(cat)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCategory(cat)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <DialogFooter><DialogClose asChild><Button variant="secondary">Close</Button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!playingUrl} onOpenChange={(open) => !open && setPlayingUrl(null)}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Play Stream</DialogTitle>
                    </DialogHeader>
                    <div className="aspect-video bg-black rounded-md overflow-hidden relative flex items-center justify-center">
                        {playingUrl && (
                            <video
                                src={playingUrl}
                                controls
                                autoPlay
                                className="w-full h-full"
                                onError={(e) => toast.error("Error playing video. Link might need to be opened in VLC or requires specific headers.")}
                            >
                                Your browser does not support the video tag.
                            </video>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground break-all">{playingUrl}</p>
                </DialogContent>
            </Dialog>

        </div>
    )
}
