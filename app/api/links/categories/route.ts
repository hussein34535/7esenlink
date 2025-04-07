import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const dataDir = path.join(process.cwd(), "data")
const linksFile = path.join(dataDir, "links.json")

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize links file if it doesn't exist
if (!fs.existsSync(linksFile)) {
  fs.writeFileSync(linksFile, JSON.stringify({ links: [], categories: [] }))
}

interface Link {
  id: number
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
    const data = fs.readFileSync(linksFile, "utf-8")
    const parsedData = JSON.parse(data)
    // Ensure the data structure is correct
    return {
      links: Array.isArray(parsedData.links) ? parsedData.links : [],
      categories: Array.isArray(parsedData.categories) ? parsedData.categories : []
    }
  } catch (error) {
    console.error("Error reading links file:", error)
    return { links: [], categories: [] }
  }
}

function writeLinks(data: LinksData) {
  try {
    fs.writeFileSync(linksFile, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error("Error writing links file:", error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      )
    }

    const data = readLinks()
    
    // Ensure categories array exists
    if (!Array.isArray(data.categories)) {
      data.categories = []
    }
    
    // Check if category already exists
    if (data.categories.includes(name)) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 }
      )
    }

    // Add new category
    data.categories.push(name)
    writeLinks(data)

    return NextResponse.json({ name })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const data = readLinks()
    // Ensure categories array exists
    if (!Array.isArray(data.categories)) {
      data.categories = []
    }
    return NextResponse.json(data.categories)
  } catch (error) {
    console.error("Error reading categories:", error)
    return NextResponse.json(
      { error: "Failed to read categories" },
      { status: 500 }
    )
  }
} 