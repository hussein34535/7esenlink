import { NextRequest, NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import fs from "fs"
import path from "path"

const dataDir = join(process.cwd(), "data")
const filePath = join(dataDir, "streams.json")
const linksFile = path.join(dataDir, "links.json")

interface Channel {
  id: number
  name: string
  url: string
  isFavorite?: boolean
  createdAt: string
  updatedAt: string
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

async function readChannels(): Promise<Channel[]> {
  try {
    if (!existsSync(filePath)) {
      return []
    }
    const content = await readFile(filePath, "utf8")
    return JSON.parse(content)
  } catch (e) {
    console.error("Error reading channels:", e)
    return []
  }
}

async function writeChannels(channels: Channel[]) {
  try {
    await writeFile(filePath, JSON.stringify(channels, null, 2))
  } catch (e) {
    console.error("Error writing channels:", e)
  }
}

function readLinks(): LinksData {
  try {
    const data = fs.readFileSync(linksFile, "utf-8")
    const parsedData = JSON.parse(data)
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

// M3U Parser (Simplified)
function parseM3U(content: string): { name: string; url: string }[] {
  const lines = content.split(/\r?\n/)
  const channels: { name: string; url: string }[] = []
  let currentName = "Unknown Channel"

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith("#EXTINF:")) {
      const nameMatch = line.match(/,(.+)$/)
      currentName = nameMatch ? nameMatch[1] : `Channel ${channels.length + 1}`
    } else if (line && !line.startsWith("#")) {
      channels.push({ name: currentName, url: line })
      currentName = "Unknown Channel" // Reset for next entry
    }
  }
  return channels
}

export async function POST(request: NextRequest) {
  try {
    let content: string | null = null;
    let category: string = "Uncategorized";

    // Check content type
    const contentType = request.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      const body = await request.json();
      content = body.content;
      category = body.category || "Uncategorized";
    } else if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      content = formData.get("m3uContent") as string;
      category = (formData.get("category") as string) || "Uncategorized";
    }

    if (!content) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 }
      );
    }

    const lines = content.split('\n');
    const newChannels: { name: string; url: string }[] = [];
    let currentName = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('#EXTINF:')) {
        // Extract channel name
        const nameMatch = trimmedLine.match(/,(.+)$/);
        if (nameMatch && nameMatch[1]) {
          currentName = nameMatch[1].trim();
        }
      } else if (trimmedLine.startsWith('http')) {
        // This is a URL line
        if (currentName) {
          newChannels.push({
            name: currentName,
            url: trimmedLine
          });
          currentName = '';
        }
      }
    }

    if (newChannels.length === 0) {
      return NextResponse.json(
        { error: "No valid channels found in the content" },
        { status: 400 }
      );
    }

    const data = readLinks();
    let currentMaxId = data.links.length > 0 ? Math.max(...data.links.map(l => l.id)) : 0;

    const newLinks: Link[] = newChannels.map(channel => {
      currentMaxId++;
      return {
        id: currentMaxId,
        name: channel.name,
        original: channel.url,
        converted: `/api/stream/${category.toLowerCase()}/${currentMaxId}`,
        category: category,
        createdAt: new Date().toISOString(),
      };
    });

    // Add new links
    data.links.push(...newLinks);

    // Update categories if needed
    if (!data.categories.includes(category)) {
      data.categories.push(category);
    }

    writeLinks(data);

    return NextResponse.json({
      success: true,
      count: newLinks.length,
      category: category
    });
  } catch (error) {
    console.error("Error importing channels:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import channels" },
      { status: 500 }
    );
  }
} 