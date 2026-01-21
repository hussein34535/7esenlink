import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

interface Link {
  id: number;
  name: string;
  original: string;
  converted: string;
  category: string;
  createdAt: string;
}

// CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

// Function to get a specific link from Firebase
async function getLinkById(id: number, category: string): Promise<Link | null> {
  try {
    const linksRef = ref(database, 'links');
    const snapshot = await get(linksRef);
    if (!snapshot.exists()) {
      console.log('Firebase path /links does not exist.');
      return null;
    }

    const linksArray: any[] = Array.isArray(snapshot.val())
      ? snapshot.val()
      : Object.values(snapshot.val() || {});

    const linkData = linksArray.find(link => link && link.id === id && link.category.toLowerCase() === category.toLowerCase());

    if (linkData) {
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
    return null;
  } catch (error) {
    console.error(`Error reading link ${id} from Firebase:`, error);
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: { category: string; id: string } }
) {
  try {
    const { category, id } = context.params;
    console.log(`Received request for category: ${category}, id: ${id}`);

    const linkId = parseInt(id);
    if (isNaN(linkId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400, headers: corsHeaders });
    }

    const link = await getLinkById(linkId, category);

    if (!link) {
      return NextResponse.json(
        { error: `Link with ID ${linkId} not found or invalid.` },
        { status: 404, headers: corsHeaders }
      );
    }
    console.log(`Found link: ${JSON.stringify(link)}`);

    if (link.category.toLowerCase() !== category.toLowerCase()) {
      console.log(`Category mismatch: Expected ${link.category}, got ${category}`);
      return NextResponse.json(
        { error: `Category mismatch. Link belongs to category ${link.category}` },
        { status: 400, headers: corsHeaders }
      );
    }

    const originalUrl = link.original;
    if (!originalUrl) {
      console.error(`Original URL missing for link ID ${linkId}`);
      return NextResponse.json({ error: 'Original URL not found for this link' }, { status: 404, headers: corsHeaders });
    }

    const streamUrl = originalUrl.startsWith('http://') || originalUrl.startsWith('https://')
      ? originalUrl
      : `http://${originalUrl}`;

    console.log(`Redirecting to: ${streamUrl}`);

    // Check for "json" mode (for Web Players that need to proxy the final URL)
    const { searchParams } = new URL(request.url);
    if (searchParams.get('json') === 'true') {
      return NextResponse.json({ url: streamUrl }, { status: 200, headers: corsHeaders });
    }

    // 🔴 307 Redirect: Maintains backward compatibility with mobile apps
    // Mobile apps follow the redirect and play the stream
    // Web browsers will face CORS (expected - web players handle this differently)
    return NextResponse.redirect(streamUrl, 307);

  } catch (error) {
    console.error('Error in stream endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to process stream request',
        details: error instanceof Error ? error.message : 'Unknown server error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 