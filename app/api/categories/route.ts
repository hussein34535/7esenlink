import { NextRequest, NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { randomUUID } from "crypto"

interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
}

const dataDir = join(process.cwd(), "data")
const filePath = join(dataDir, "categories.json")

async function ensureDataDir() {
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true })
  }
}

async function readCategories(): Promise<Category[]> {
  await ensureDataDir()
  if (!existsSync(filePath)) {
    return []
  }
  const content = await readFile(filePath, "utf8")
  try {
    const categories = JSON.parse(content)
    return Array.isArray(categories) ? categories : []
  } catch (e) {
    console.error("Error parsing categories.json:", e)
    return []
  }
}

async function writeCategories(categories: Category[]) {
  await ensureDataDir()
  await writeFile(filePath, JSON.stringify(categories, null, 2))
}

export async function GET() {
  try {
    const categories = await readCategories()
    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error reading categories:", error)
    return NextResponse.json({ error: "Failed to read categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, icon, color } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const categories = await readCategories()

    if (categories.some((c) => c.name === name)) {
      return NextResponse.json(
        { error: `Category name '${name}' already exists` },
        { status: 409 }
      )
    }

    const newCategory: Category = {
      id: randomUUID(),
      name,
      description,
      icon,
      color,
    }

    categories.push(newCategory)
    await writeCategories(categories)

    return NextResponse.json(newCategory, { status: 201 })
  } catch (error) {
    console.error("Error adding category:", error)
    return NextResponse.json({ error: "Failed to add category" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const categoryToUpdate: Category = await request.json()

    if (!categoryToUpdate.id || !categoryToUpdate.name) {
      return NextResponse.json(
        { error: "ID and Name are required for update" },
        { status: 400 }
      )
    }

    const categories = await readCategories()
    const categoryIndex = categories.findIndex((c) => c.id === categoryToUpdate.id)

    if (categoryIndex === -1) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    if (
      categories.some(
        (c) => c.name === categoryToUpdate.name && c.id !== categoryToUpdate.id
      )
    ) {
      return NextResponse.json(
        { error: `Category name '${categoryToUpdate.name}' already exists` },
        { status: 409 }
      )
    }

    categories[categoryIndex] = categoryToUpdate
    await writeCategories(categories)

    return NextResponse.json(categoryToUpdate)
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }

    const categories = await readCategories()
    const initialLength = categories.length

    const updatedCategories = categories.filter((c) => c.id !== id)

    if (updatedCategories.length === initialLength) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    await writeCategories(updatedCategories)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
} 