import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/firebase'; // Import Firebase database instance
import { ref, get, set } from 'firebase/database'; // Import Firebase functions

// Keep the Link interface consistent
interface Link {
  id: number
  name: string
  original: string
  converted: string
  category: string
  createdAt: string
}

// Function to get all links from Firebase (copied from import route for consistency)
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
            ? linksData.filter(link => link !== null) // Filter out potential nulls if stored as sparse array
            : Object.values(linksData || {});

        // Basic validation for each link (optional but recommended) and normalize category to lowercase
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
            category: link.category.toLowerCase() // Normalize category to lowercase here
        }));
    } catch (error) {
        console.error(`Error reading links from Firebase:`, error);
        // Depending on requirements, you might want to throw the error
        // or return an empty array to allow the operation to fail gracefully.
        throw new Error('Failed to read links from Firebase');
    }
}

// Function to write all links to Firebase (overwrites existing data at /links)
async function writeLinksToFirebase(links: Link[]): Promise<void> {
    try {
        const linksRef = ref(database, 'links');
        // Overwrite the entire /links path with the new array
        // Ensure nulls aren't written if Firebase expects dense arrays or objects
        const dataToWrite = links.filter(link => link !== null);
        await set(linksRef, dataToWrite);
        console.log(`Successfully wrote ${dataToWrite.length} links to Firebase.`);
    } catch (error) {
        console.error(`Error writing links to Firebase:`, error);
        throw error; // Re-throw the error to be caught by the main handler
    }
}

// Function to parse M3U content and extract URLs
function parseM3UUrls(content: string): string[] {
  const lines = content.split(/\r\n|\n/)
  const urls: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Ensure it's a URL (simple check for http/https) and not empty/comment
    if (line && !line.startsWith('#') && (line.startsWith('http://') || line.startsWith('https://'))) {
      urls.push(line)
    }
  }

  return urls
}

export async function POST(request: NextRequest) {
  try {
    const { linkIds: compositeLinkIds, m3uContent } = await request.json(); // Renamed linkIds to compositeLinkIds

    if (!Array.isArray(compositeLinkIds) || compositeLinkIds.length === 0) {
      return NextResponse.json({ error: 'No links selected' }, { status: 400 });
    }

    // Parse composite link IDs into an array of { id: number, category: string }
    const parsedLinkIds = compositeLinkIds.map((compositeId: string) => {
      const [categoryStr, idStr] = compositeId.split('-');
      return { id: parseInt(idStr), category: categoryStr };
    });

    if (!m3uContent) {
      return NextResponse.json({ error: 'No M3U content provided' }, { status: 400 });
    }

    const urls = parseM3UUrls(m3uContent);
    if (urls.length === 0) {
      return NextResponse.json({ error: 'No valid URLs found in M3U content' }, { status: 400 });
    }

    if (urls.length !== parsedLinkIds.length) {
      return NextResponse.json({
        error: 'Number of URLs in M3U content does not match number of selected links',
        details: {
          selectedLinks: parsedLinkIds.length,
          urlsFound: urls.length
        }
      }, { status: 400 });
    }

    // Read existing links from Firebase
    const existingLinks = await getLinksFromFirebase();

    // Update each selected link with the corresponding URL
    let updatedCount = 0;
    const updatedLinks = [...existingLinks]; // Create a mutable copy

    parsedLinkIds.forEach((parsedId, index) => {
      const linkIndex = updatedLinks.findIndex(
        l => l.id === parsedId.id && l.category === parsedId.category
      );

      if (linkIndex !== -1) {
        updatedLinks[linkIndex] = {
            ...updatedLinks[linkIndex],
            original: urls[index] // Update the original URL
        };
        updatedCount++;
      } else {
          console.warn(`Link with ID ${parsedId.id} and category ${parsedId.category} not found in Firebase data.`);
      }
    });

    if (updatedCount === 0) {
      // This could happen if the selected IDs/categories don't exist in Firebase anymore
      return NextResponse.json({ error: 'No matching links found to update' }, { status: 404 });
    }

    // Write the updated list back to Firebase
    await writeLinksToFirebase(updatedLinks);

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