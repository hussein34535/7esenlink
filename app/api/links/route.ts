import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data')
const linksFile = path.join(dataDir, 'links.json')

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true })
  } catch (error) {
    console.error('Error creating data directory:', error)
  }
}

// Initialize links file if it doesn't exist
if (!fs.existsSync(linksFile)) {
  try {
    fs.writeFileSync(linksFile, JSON.stringify({ links: [], categories: [] }))
  } catch (error) {
    console.error('Error initializing links file:', error)
  }
}

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

function readLinks(): LinksData {
  try {
    const data = fs.readFileSync(linksFile, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading links file:', error)
    return { links: [], categories: [] }
  }
}

function writeLinks(data: LinksData) {
  try {
    fs.writeFileSync(linksFile, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error writing links file:', error)
    throw new Error('Failed to write to storage')
  }
}

export async function GET() {
  try {
    const data = readLinks()
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

    const data = readLinks()
    if (!data.links || !Array.isArray(data.links)) {
      console.error('Invalid links data structure:', data)
      return NextResponse.json({ error: 'Invalid data structure' }, { status: 500 })
    }

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

    try {
      // Write the updated data
      writeLinks(data)
      return NextResponse.json(newLink)
    } catch (writeError) {
      console.error('Error writing to storage:', writeError)
      return NextResponse.json({ 
        error: 'This feature is not available in production. Please use a database for persistent storage.',
        details: 'The application is running in a serverless environment where file system writes are not allowed.'
      }, { status: 500 })
    }
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

    const data = readLinks()
    const originalLength = data.links.length
    data.links = data.links.filter(link => !ids.includes(link.id))

    // Update categories list
    const remainingCategories = new Set(data.links.map(link => link.category))
    data.categories = Array.from(remainingCategories)

    writeLinks(data)

    return NextResponse.json({
      message: `Deleted ${originalLength - data.links.length} links`,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete links' }, { status: 500 })
  }
} 