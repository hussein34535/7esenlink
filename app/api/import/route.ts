import { NextRequest, NextResponse } from "next/server"
import { database } from '@/lib/firebase'; // Import Firebase database instance
import { ref, get, set } from 'firebase/database'; // Import Firebase functions

interface Channel {
  id: number
  name: string
  url: string
  isFavorite?: boolean
  createdAt: string
  updatedAt: string
}

// Keep the Link interface, but LinksData is no longer needed for file structure
interface Link {
    id: number;
    name: string;
    original: string;
    converted: string;
    category: string;
    createdAt: string; // Ensure this matches the stream endpoint interface
}

// Remove functions related to reading/writing local files (readChannels, writeChannels, readLinks, writeLinks)

// Function to get all links from Firebase
async function getLinksFromFirebase(): Promise<Link[]> {
    try {
        const linksRef = ref(database, 'links');
        const snapshot = await get(linksRef);
        if (!snapshot.exists()) {
            console.log('Firebase path /links does not exist. Returning empty array.');
            return [];
        }
        // Handle both array and object structures from Firebase
        const linksData = snapshot.val();
        const linksArray: Link[] = Array.isArray(linksData)
            ? linksData
            : Object.values(linksData || {});
        
        // Basic validation for each link (optional but recommended)
        return linksArray.filter(link =>
            link &&
            typeof link.id === 'number' &&
            typeof link.name === 'string' &&
            typeof link.original === 'string' &&
            typeof link.converted === 'string' &&
            typeof link.category === 'string' &&
            typeof link.createdAt === 'string'
        );
    } catch (error) {
        console.error(`Error reading links from Firebase:`, error);
        // Depending on requirements, you might want to throw the error
        // or return an empty array to allow the import to proceed partially/fail gracefully.
        return [];
    }
}

// Function to write all links to Firebase (overwrites existing data at /links)
async function writeLinksToFirebase(links: Link[]): Promise<void> {
    try {
        const linksRef = ref(database, 'links');
        // Overwrite the entire /links path with the new array
        await set(linksRef, links);
        console.log(`Successfully wrote ${links.length} links to Firebase.`);
    } catch (error) {
        console.error(`Error writing links to Firebase:`, error);
        throw error; // Re-throw the error to be caught by the main handler
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

    // Read existing links from Firebase
    const existingLinks = await getLinksFromFirebase();

    // Filter existing links by the current import category
    const existingLinksInCurrentCategory = existingLinks.filter(link => link.category === category);

    // Calculate currentMaxId based only on links within the current category
    let currentMaxId = existingLinksInCurrentCategory.length > 0
      ? Math.max(...existingLinksInCurrentCategory.map(l => l.id))
      : 0;

    const newLinks: Link[] = newChannels.map(channel => {
      currentMaxId++;
      return {
        id: currentMaxId,
        name: channel.name,
        original: channel.url,
        converted: `/api/stream/${category.toLowerCase()}/${currentMaxId}`,
        category: category.toLowerCase(),
        createdAt: new Date().toISOString(),
      };
    });

    // Combine existing links (excluding those of the current category) with the new links for this category
    const otherExistingLinks = existingLinks.filter(link => link.category !== category);
    const updatedLinks = [...otherExistingLinks, ...newLinks];

    // Write the combined list back to Firebase
    await writeLinksToFirebase(updatedLinks);

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