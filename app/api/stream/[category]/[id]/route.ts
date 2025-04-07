import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase'; // Import Firebase database instance
import { ref, get } from 'firebase/database'; // Import Firebase functions

interface Link {
  id: number;
  name: string;
  original: string;
  converted: string;
  category: string;
  createdAt: string; // Added createdAt based on other files
}

// Function to get a specific link from Firebase
async function getLinkById(id: number): Promise<Link | null> {
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

    // Find the link by ID
    const linkData = linksArray.find(link => link && link.id === id);

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
  { params }: { params: { category: string; id: string } }
) {
  try {
    const { category, id } = params;
    console.log(`Received request for category: ${category}, id: ${id}`);

    // Validate ID
    const linkId = parseInt(id);
    if (isNaN(linkId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Fetch the specific link from Firebase
    const link = await getLinkById(linkId);

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

    // Ensure URL has protocol
    const urlWithProtocol = originalUrl.startsWith('http://') || originalUrl.startsWith('https://') 
      ? originalUrl 
      : `http://${originalUrl}`;
    console.log(`Fetching stream from: ${urlWithProtocol}`);

    // Fetch the stream
    const response = await fetch(urlWithProtocol, { 
        headers: { 
            // Add headers if needed by the source, e.g., User-Agent
            'User-Agent': 'IPTVRedirect/1.0' 
        } 
    });

    if (!response.ok) {
        console.error(`Failed to fetch stream from ${urlWithProtocol}: ${response.status} ${response.statusText}`);
        // Try to read the error body if possible
        const errorBody = await response.text().catch(() => 'Could not read error body');
        throw new Error(`Upstream fetch failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    console.log(`Received Content-Type: ${contentType}`);

    // Create response with the stream
    const streamResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': contentType,
        // Add other relevant headers from the original response if needed
        // 'Content-Length': response.headers.get('Content-Length') || '',
        'X-Channel-Name': encodeURIComponent(link.name),
        'X-Channel-Category': encodeURIComponent(link.category)
      }
    });

    console.log(`Streaming response for ID ${linkId} with Content-Type: ${contentType}`);
    return streamResponse;

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