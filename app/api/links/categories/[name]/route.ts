import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const dataDir = path.join(process.cwd(), "data")
const linksFile = path.join(dataDir, "links.json")

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
    return JSON.parse(data)
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

export async function DELETE(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const categoryName = decodeURIComponent(params.name)
    const data = readLinks()

    // Check if category exists
    if (!data.categories.includes(categoryName)) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    // Remove category from list
    data.categories = data.categories.filter(c => c !== categoryName)

    // Update links that were in this category
    data.links = data.links.map(link => 
      link.category === categoryName 
        ? { ...link, category: "Uncategorized" }
        : link
    )

    writeLinks(data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
} 