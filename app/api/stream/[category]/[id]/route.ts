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

    const urlToFetch = originalUrl.startsWith('http://') || originalUrl.startsWith('https://')
      ? originalUrl
      : `http://${originalUrl}`;

    console.log(`Proxying stream from: ${urlToFetch}`);

    // 🔴 Streaming Proxy: Mimic VLC behavior (no Referer/Origin)
    const upstreamResponse = await fetch(urlToFetch, {
      headers: {
        // VLC-like User-Agent - some servers prefer this over browser UAs
        'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
        'Accept': '*/*',
        // NO Referer or Origin - VLC doesn't send these!
      },
      redirect: 'follow',
    });

    if (!upstreamResponse.ok) {
      console.error(`Upstream server returned ${upstreamResponse.status}`);
      return NextResponse.json(
        { error: `Upstream server error: ${upstreamResponse.status}` },
        { status: upstreamResponse.status, headers: corsHeaders }
      );
    }

    // Stream the response back with CORS headers
    const responseHeaders = new Headers(corsHeaders);

    // Copy content-type from upstream if available
    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    } else {
      // Default to HLS content type
      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
    }

    return new Response(upstreamResponse.body, {
      status: 200,
      headers: responseHeaders,
    });

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