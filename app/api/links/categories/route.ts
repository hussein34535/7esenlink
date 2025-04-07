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

export async function GET() {
  try {
    console.log('GET /api/links/categories called')
    const data = await getLinksData()
    return NextResponse.json(data.categories)
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
    
    // Parse the request body
    let body
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

    // Get the category name from the body
    const category = body.name || body.category
    console.log('Category to add:', category)
    
    if (!category) {
      console.log('Category is missing')
      return NextResponse.json({ 
        error: 'Category name is required',
        receivedBody: body 
      }, { status: 400 })
    }

    const data = await getLinksData()
    console.log('Current data:', data)
    
    if (!data.categories.includes(category)) {
      console.log('Adding new category:', category)
      data.categories.push(category)
      await saveLinksData(data)
      console.log('Category added successfully')
    } else {
      console.log('Category already exists:', category)
    }

    return NextResponse.json({ success: true, category })
  } catch (error) {
    console.error('Error in POST /api/links/categories:', error)
    return NextResponse.json({ 
      error: 'Failed to create category',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 