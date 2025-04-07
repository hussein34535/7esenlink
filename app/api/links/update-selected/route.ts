import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data')
const linksFile = path.join(dataDir, 'links.json')

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
    const parsed = JSON.parse(data)
    return parsed
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
  }
}

// Function to parse M3U content and extract URLs
function parseM3UUrls(content: string): string[] {
  const lines = content.split(/\r\n|\n/)
  const urls: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line && !line.startsWith('#')) {
      urls.push(line)
    }
  }

  return urls
}

export async function POST(request: Request) {
  try {
    const { linkIds, m3uContent } = await request.json()

    if (!Array.isArray(linkIds) || linkIds.length === 0) {
      return NextResponse.json({ error: 'No links selected' }, { status: 400 })
    }

    if (!m3uContent) {
      return NextResponse.json({ error: 'No M3U content provided' }, { status: 400 })
    }

    const urls = parseM3UUrls(m3uContent)
    if (urls.length === 0) {
      return NextResponse.json({ error: 'No valid URLs found in M3U content' }, { status: 400 })
    }

    if (urls.length !== linkIds.length) {
      return NextResponse.json({ 
        error: 'Number of URLs in M3U content does not match number of selected links',
        details: {
          selectedLinks: linkIds.length,
          urlsFound: urls.length
        }
      }, { status: 400 })
    }

    const data = readLinks()
    if (!data.links || !Array.isArray(data.links)) {
      return NextResponse.json({ error: 'Invalid data structure' }, { status: 500 })
    }

    // Update each selected link with the corresponding URL
    let updatedCount = 0
    linkIds.forEach((linkId, index) => {
      const link = data.links.find(l => l.id === linkId)
      if (link) {
        link.original = urls[index]
        updatedCount++
      }
    })

    if (updatedCount === 0) {
      return NextResponse.json({ error: 'No links were updated' }, { status: 400 })
    }

    writeLinks(data)

    return NextResponse.json({ 
      message: `Successfully updated ${updatedCount} links`,
      updatedCount
    })

  } catch (error) {
    console.error('Error updating links:', error)
    return NextResponse.json({ 
      error: 'Failed to update links',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 