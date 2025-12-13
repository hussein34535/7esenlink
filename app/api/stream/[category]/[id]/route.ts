import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase'; // Import Firebase database instance
import { ref, get } from 'firebase/database'; // Import Firebase functions
// Removed M3U8 parser import as it's no longer used

interface Link {
  id: number;
  name: string;
  original: string;
  converted: string;
  category: string;
  createdAt: string; // Added createdAt based on other files
}

// Function to get a specific link from Firebase
async function getLinkById(id: number, category: string): Promise<Link | null> {
  try {
    // Assuming links are stored as an array at the /links path
    const linksRef = ref(database, 'links');
    const snapshot = await get(linksRef);
    if (!snapshot.exists()) {
      console.log('Firebase path /links does not exist.');
      return null;
    }
    
    const linksArray: any[] = Array.isArray(snapshot.val()) 
        ? snapshot.val() 
        : Object.values(snapshot.val() || {}); // Handle array or object

    // Find the link by ID and category (case-insensitive for category)
    const linkData = linksArray.find(link => link && link.id === id && link.category.toLowerCase() === category.toLowerCase());

    if (linkData) {
        // Basic validation
        if (typeof linkData.id === 'number' && 
            typeof linkData.name === 'string' && 
            typeof linkData.original === 'string' &&
            typeof linkData.converted === 'string' &&
            typeof linkData.category === 'string' &&
            typeof linkData.createdAt === 'string') {
                return linkData as Link;
            }
         else {
            console.warn(`Link data for ID ${id} has incorrect structure.`);
            return null;
         }
    }
    return null; // Link not found
  } catch (error) {
    console.error(`Error reading link ${id} from Firebase:`, error);
    return null; // Return null on error
  }
}
export async function GET(
  request: Request,
  context: { params: { category: string; id: string } } // Use a different name like 'context'
) {
  try {
    // Access params from the context object
    const { category, id } = context.params;
    console.log(`Received request for category: ${category}, id: ${id}`);
    console.log(`Received request for category: ${category}, id: ${id}`);

    // Validate ID
    const linkId = parseInt(id);
    if (isNaN(linkId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Fetch the specific link from Firebase, passing both ID and category
    const link = await getLinkById(linkId, category);

    if (!link) {
      return NextResponse.json(
        { error: `Link with ID ${linkId} not found or invalid.` },
        { status: 404 }
      );
    }
    console.log(`Found link: ${JSON.stringify(link)}`);

    // Check category match (case-insensitive)
    if (link.category.toLowerCase() !== category.toLowerCase()) {
      console.log(`Category mismatch: Expected ${link.category}, got ${category}`);
      return NextResponse.json(
        { error: `Category mismatch. Link belongs to category ${link.category}` },
        { status: 400 }
      );
    }

    // Fetch the original URL
    const originalUrl = link.original;
    if (!originalUrl) {
        console.error(`Original URL missing for link ID ${linkId}`);
        return NextResponse.json({ error: 'Original URL not found for this link' }, { status: 404 });
    }

    // Ensure URL has protocol before redirecting
    const urlToRedirect = originalUrl.startsWith('http://') || originalUrl.startsWith('https://')
      ? originalUrl
      : `http://${originalUrl}`;

    console.log(`Redirecting client to: ${urlToRedirect}`);
    
    // Return a 302 redirect response
    // Using 307 (Temporary Redirect) might be slightly more appropriate semantically
    // as the resource itself hasn't moved, we're just directing the client there for this request.
    return NextResponse.redirect(urlToRedirect, 307);

  } catch (error) {
    console.error('Error in stream endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process stream request',
        details: error instanceof Error ? error.message : 'Unknown server error'
      },
      { status: 500 }
    );
  }
} 