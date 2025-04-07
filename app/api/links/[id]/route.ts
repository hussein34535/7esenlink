import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data')
const linksFile = path.join(dataDir, 'links.json')

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
    throw error
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const linkId = parseInt(params.id)
    const { category } = await request.json()

    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    const data = readLinks()
    const linkIndex = data.links.findIndex(link => link.id === linkId)

    if (linkIndex === -1) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    // Update the link's category
    data.links[linkIndex] = {
      ...data.links[linkIndex],
      category
    }

    writeLinks(data)

    return NextResponse.json(data.links[linkIndex])
  } catch (error) {
    console.error('Error updating link:', error)
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const linkId = parseInt(params.id)
    const data = readLinks()
    const linkIndex = data.links.findIndex(link => link.id === linkId)

    if (linkIndex === -1) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    // Remove the link
    data.links.splice(linkIndex, 1)
    writeLinks(data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting link:', error)
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    )
  }
} 