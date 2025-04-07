import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Link {
  id: number;
  name: string;
  original: string;
  converted: string;
  category: string;
}

interface LinksData {
  links: Link[];
  categories: string[];
}

const dataDir = path.join(process.cwd(), 'data');
const linksFile = path.join(dataDir, 'links.json');

async function readLinks(): Promise<LinksData> {
  try {
    const data = await fs.promises.readFile(linksFile, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      links: parsed.links || [],
      categories: parsed.categories || []
    };
  } catch (error) {
    console.error('Error reading links file:', error);
    return { links: [], categories: [] };
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
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Read links
    const data = await readLinks();
    console.log(`Available links: ${data.links.map(l => l.id).join(', ')}`);

    // Find the link
    const link = data.links.find(l => l.id === linkId);
    if (!link) {
      return NextResponse.json(
        { error: `Link with ID ${linkId} not found` },
        { status: 404 }
      );
    }

    // Check category match
    if (link.category.toLowerCase() !== category.toLowerCase()) {
      return NextResponse.json(
        { error: `Category mismatch. Expected ${link.category}, got ${category}` },
        { status: 400 }
      );
    }

    // Fetch the original URL
    const originalUrl = link.original;
    if (!originalUrl) {
      return NextResponse.json(
        { error: 'Original URL not found' },
        { status: 404 }
      );
    }

    // Ensure URL has protocol
    const urlWithProtocol = originalUrl.startsWith('http') 
      ? originalUrl 
      : `http://${originalUrl}`;

    // Fetch the stream
    const response = await fetch(urlWithProtocol);
    if (!response.ok) {
      throw new Error(`Failed to fetch stream: ${response.statusText}`);
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Create response with the stream
    const streamResponse = new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType,
        'X-Channel-Name': encodeURIComponent(link.name),
        'X-Channel-Category': encodeURIComponent(link.category)
      }
    });

    return streamResponse;
  } catch (error) {
    console.error('Error in stream endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stream' },
      { status: 500 }
    );
  }
} 