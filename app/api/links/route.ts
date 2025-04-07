import { NextResponse } from 'next/server'
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

interface LinksData {
  links: Link[]
  categories: string[]
}

async function getLinksData(): Promise<LinksData> {
  try {
    const linksRef = ref(database, 'links')
    const snapshot = await get(linksRef)
    const data = snapshot.val()
    return data || { links: [], categories: [] }
  } catch (error) {
    console.error('Error reading from Firebase:', error)
    return { links: [], categories: [] }
  }
}

async function saveLinksData(data: LinksData) {
  try {
    const linksRef = ref(database, 'links')
    await set(linksRef, data)
  } catch (error) {
    console.error('Error writing to Firebase:', error)
    throw new Error('Failed to save data to Firebase')
  }
}

export async function GET() {
  try {
    const data = await getLinksData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/links:', error)
    return NextResponse.json({ error: 'Failed to read links' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { original, name, category } = await request.json()
    
    if (!original || !name) {
      return NextResponse.json({ error: 'Original URL and name are required' }, { status: 400 })
    }

    const data = await getLinksData()
    
    // Generate a new ID
    const newId = data.links.length > 0 ? Math.max(...data.links.map(l => l.id)) + 1 : 1
    
    // Determine the category, defaulting to 'Uncategorized'
    const linkCategory = category || 'Uncategorized'
    // Create the category-based static URL (use lowercase for consistency)
    const convertedUrl = `/api/stream/${linkCategory.toLowerCase()}/${newId}`

    // Create the new link
    const newLink: Link = {
      id: newId,
      name,
      original,
      converted: convertedUrl,
      category: linkCategory,
      createdAt: new Date().toISOString()
    }

    // Add the new link
    data.links.push(newLink)

    // Update categories if needed
    if (linkCategory !== 'Uncategorized' && !data.categories.includes(linkCategory)) {
      data.categories.push(linkCategory)
    }

    // Save to Firebase
    await saveLinksData(data)

    return NextResponse.json(newLink)
  } catch (error) {
    console.error('Error in POST /api/links:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'IDs must be an array' },
        { status: 400 }
      )
    }

    const data = await getLinksData()
    const originalLength = data.links.length
    data.links = data.links.filter(link => !ids.includes(link.id))

    // Update categories list
    const remainingCategories = new Set(data.links.map(link => link.category))
    data.categories = Array.from(remainingCategories)

    // Save to Firebase
    await saveLinksData(data)

    return NextResponse.json({
      message: `Deleted ${originalLength - data.links.length} links`,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete links' }, { status: 500 })
  }
} 