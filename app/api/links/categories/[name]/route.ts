import { NextResponse } from "next/server"
import { database } from '@/lib/firebase'
import { ref, get, set } from 'firebase/database'

interface Link {
  id: number
  name: string
  original: string
  converted: string
  category: string
  createdAt: string
}

async function getLinksFromFirebase(): Promise<Link[]> {
  try {
    const linksRef = ref(database, 'links')
    const snapshot = await get(linksRef)
    if (!snapshot.exists()) {
      return []
    }
    const linksData = snapshot.val()
    const linksArray: Link[] = Array.isArray(linksData)
      ? linksData.filter(link => link !== null)
      : Object.values(linksData || {})
    
    return linksArray.filter(link =>
      link &&
      typeof link.id === 'number' &&
      typeof link.name === 'string' &&
      typeof link.original === 'string' &&
      typeof link.converted === 'string' &&
      typeof link.category === 'string' &&
      typeof link.createdAt === 'string'
    ).map(link => ({
      ...link,
      category: link.category.toLowerCase()
    }))
  } catch (error) {
    console.error(`Error reading links from Firebase:`, error)
    throw new Error('Failed to read links from Firebase')
  }
}

async function saveLinksToFirebase(links: Link[]): Promise<void> {
  try {
    const linksRef = ref(database, 'links')
    const dataToWrite = links.filter(link => link !== null)
    await set(linksRef, dataToWrite)
  } catch (error) {
    console.error(`Error writing links to Firebase:`, error)
    throw error
  }
}

async function getCategoriesFromFirebase(): Promise<string[]> {
  const categoriesRef = ref(database, 'categories')
  const snapshot = await get(categoriesRef)
  if (!snapshot.exists()) {
    return []
  }
  const rawCategories: any[] = Array.isArray(snapshot.val()) ? snapshot.val() : []
  const categories: string[] = Array.from(
    new Set(
      rawCategories
        .map(cat => typeof cat === 'string' ? cat.trim().toLowerCase() : '')
        .filter(cat => cat !== '')
    )
  )
  return categories
}

async function saveCategoriesToFirebase(categories: string[]) {
  try {
    const categoriesRef = ref(database, 'categories')
    const validCategories = Array.from(new Set(categories.filter(c => typeof c === 'string' && c.trim() !== '').map(c => c.toLowerCase())))
    await set(categoriesRef, validCategories)
  } catch (error) {
    console.error('Error writing categories to Firebase:', error)
    throw new Error('Failed to save categories data to Firebase')
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const categoryName = decodeURIComponent(params.name).toLowerCase()

    // Fetch current links and categories from Firebase
    const [currentLinks, currentCategories] = await Promise.all([
      getLinksFromFirebase(),
      getCategoriesFromFirebase()
    ])

    // Check if category exists (case-insensitive)
    if (!currentCategories.includes(categoryName)) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    // Remove category from list
    const updatedCategories = currentCategories.filter(c => c !== categoryName)

    // Update links that were in this category: move them to "uncategorized"
    const updatedLinks = currentLinks.map(link => 
      link.category === categoryName 
        ? { ...link, category: "uncategorized" }
        : link
    )

    // Save updated links and categories to Firebase
    await saveLinksToFirebase(updatedLinks)
    await saveCategoriesToFirebase(updatedCategories)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
} 