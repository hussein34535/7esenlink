import { NextResponse } from 'next/server'
import { database } from '@/lib/firebase'
import { ref, get, set } from 'firebase/database'

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

async function getLinksData(): Promise<LinksData> {
  console.log('Attempting to read from Firebase path: /links');
  try {
    const linksRef = ref(database, 'links');
    const snapshot = await get(linksRef);

    if (!snapshot.exists()) {
      console.log('Firebase path /links does not exist. Returning empty data.');
      return { links: [], categories: [] };
    }

    const data = snapshot.val();
    console.log('Raw data retrieved from Firebase:', JSON.stringify(data, null, 2));

    // Validate and normalize the data structure
    const rawLinks: any[] = Array.isArray(data?.links) ? data.links : [];
    const rawCategories: any[] = Array.isArray(data?.categories) ? data.categories : [];

    // Filter categories to ensure they are unique, non-empty strings
    const categories: string[] = Array.from(
      new Set(
        rawCategories
          .map(cat => typeof cat === 'string' ? cat.trim() : '') // Convert to trimmed string or empty
          .filter(cat => cat !== '') // Filter out empty strings
      )
    );

    // Validate each link object
    const validatedLinks = rawLinks.filter((link: any): link is Link => 
        link && 
        typeof link.id === 'number' && 
        typeof link.name === 'string' && 
        typeof link.original === 'string' &&
        typeof link.converted === 'string' &&
        typeof link.category === 'string' &&
        typeof link.createdAt === 'string'
    );

    if (validatedLinks.length !== rawLinks.length) {
        console.warn('Some link objects were invalid and filtered out.');
    }

    const structuredData: LinksData = { links: validatedLinks, categories };
    console.log('Returning structured data:', JSON.stringify(structuredData, null, 2));
    return structuredData;

  } catch (error) {
    console.error('Error reading from Firebase in getLinksData:', error);
    throw error; 
  }
}

async function saveLinksData(data: LinksData) {
  try {
    const linksRef = ref(database, 'links')
    await set(linksRef, data)
  } catch (error) {
    console.error('Error writing to Firebase:', error)
    throw new Error('Failed to save data to Firebase')
  }
}

export async function GET() {
  try {
    console.log('GET /api/links request received');
    const data = await getLinksData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/links:', error);
    // Provide more details in the error response
    return NextResponse.json({
      error: 'Failed to read links data',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { original, name, category } = await request.json()
    
    if (!original || !name) {
      return NextResponse.json({ error: 'Original URL and name are required' }, { status: 400 })
    }

    const data = await getLinksData()
    
    // Generate a new ID
    const newId = data.links.length > 0 ? Math.max(...data.links.map(l => l.id)) + 1 : 1
    
    // Determine the category, defaulting to 'Uncategorized'
    const linkCategory = category || 'Uncategorized'
    // Create the category-based static URL (use lowercase for consistency)
    const convertedUrl = `/api/stream/${linkCategory.toLowerCase()}/${newId}`

    // Create the new link
    const newLink: Link = {
      id: newId,
      name,
      original,
      converted: convertedUrl,
      category: linkCategory,
      createdAt: new Date().toISOString()
    }

    // Add the new link
    data.links.push(newLink)

    // Update categories if needed
    if (linkCategory !== 'Uncategorized' && !data.categories.includes(linkCategory)) {
      data.categories.push(linkCategory)
    }

    // Save to Firebase
    await saveLinksData(data)

    return NextResponse.json(newLink)
  } catch (error) {
    console.error('Error in POST /api/links:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'IDs must be an array' },
        { status: 400 }
      )
    }

    const data = await getLinksData()
    const originalLength = data.links.length
    data.links = data.links.filter(link => !ids.includes(link.id))

    // Update categories list
    const remainingCategories = new Set(data.links.map(link => link.category))
    data.categories = Array.from(remainingCategories)

    // Save to Firebase
    await saveLinksData(data)

    return NextResponse.json({
      message: `Deleted ${originalLength - data.links.length} links`,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete links' }, { status: 500 })
  }
} 