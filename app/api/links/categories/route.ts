import { NextResponse } from 'next/server'
import { database } from '@/lib/firebase'
import { ref, get, set } from 'firebase/database'

interface LinksData {
  links: any[]
  categories: string[]
}

async function getLinksData(): Promise<LinksData> {
  try {
    const linksRef = ref(database, 'links')
    console.log('Reading from Firebase at path:', linksRef.toString())
    const snapshot = await get(linksRef)
    if (!snapshot.exists()) {
      console.log('No data exists at path, returning empty data')
      return { links: [], categories: [] }
    }
    const data = snapshot.val()
    console.log('Retrieved data:', data)

    // Ensure the data has the correct structure
    if (!data.categories) {
      data.categories = []
    }
    if (!data.links) {
      data.links = []
    }

    return data
  } catch (error) {
    console.error('Error reading from Firebase:', error)
    throw error // Re-throw to handle in the route handler
  }
}

async function saveLinksData(data: LinksData) {
  try {
    const linksRef = ref(database, 'links')
    console.log('Saving data to Firebase:', data)
    await set(linksRef, data)
    console.log('Data saved successfully')
  } catch (error) {
    console.error('Error writing to Firebase:', error)
    throw error // Re-throw to handle in the route handler
  }
}

async function getCategories(): Promise<string[]> {
  const categoriesRef = ref(database, 'categories');
  const snapshot = await get(categoriesRef);
  if (!snapshot.exists()) {
    return [];
  }
  const rawCategories: any[] = Array.isArray(snapshot.val()) ? snapshot.val() : [];
  return Array.from(
    new Set(
      rawCategories
        .map(cat => typeof cat === 'string' ? cat.trim() : '')
        .filter(cat => cat !== '')
    )
  );
}

async function saveCategories(categories: string[]) {
  try {
    const categoriesRef = ref(database, 'categories');
    const validCategories = Array.from(new Set(categories.filter(c => typeof c === 'string' && c.trim() !== '')));
    console.log('[Categories Route] Saving categories to Firebase path /categories:', validCategories);
    await set(categoriesRef, validCategories);
    console.log('[Categories Route] Categories saved successfully');
  } catch (error) {
    console.error('[Categories Route] Error writing categories to Firebase:', error);
    throw new Error('Failed to save categories data to Firebase');
  }
}

export async function GET() {
  try {
    console.log('GET /api/links/categories called')
    const categories = await getCategories()
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error in GET /api/links/categories:', error)
    return NextResponse.json({
      error: 'Failed to read categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/links/categories called')

    let body;
    try {
      body = await request.json()
      console.log('Request body:', body)
    } catch (error) {
      console.error('Error parsing request body:', error)
      return NextResponse.json({
        error: 'Invalid request body',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
    }

    const categoryToAdd = body.name || body.category
    console.log('Category to add:', categoryToAdd)

    if (!categoryToAdd || typeof categoryToAdd !== 'string' || categoryToAdd.trim() === '') {
      console.log('Category is missing or invalid')
      return NextResponse.json({
        error: 'Valid category name is required',
        receivedBody: body
      }, { status: 400 })
    }

    const trimmedCategory = categoryToAdd.trim();

    // Fetch only categories
    const currentCategories = await getCategories()
    console.log('Current categories:', currentCategories)

    let updatedCategories = [...currentCategories];
    if (!currentCategories.includes(trimmedCategory)) {
      console.log('Adding new category:', trimmedCategory)
      updatedCategories.push(trimmedCategory);
      // Save only categories
      await saveCategories(updatedCategories)
      console.log('Category added successfully')
    } else {
      console.log('Category already exists:', trimmedCategory)
    }

    // Return success and the added/existing category
    return NextResponse.json({ success: true, category: trimmedCategory })
  } catch (error) {
  }, { status: 500 })
}
}

export async function PUT(request: Request) {
  try {
    const categories = await request.json()

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'Categories must be an array' }, { status: 400 })
    }

    await saveCategories(categories)
    return NextResponse.json({ success: true, message: 'Categories updated' })
  } catch (error) {
    console.error('Error updating categories:', error)
    return NextResponse.json({ error: 'Failed to update categories' }, { status: 500 })
  }
} 