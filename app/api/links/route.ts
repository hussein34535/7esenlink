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

async function getLinks(): Promise<Link[]> {
  const linksRef = ref(database, 'links');
  const snapshot = await get(linksRef);
  if (!snapshot.exists()) {
    return [];
  }
  const rawLinks: any[] = Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val()); // Handle both array and object structures
  // Validate links (similar to previous validation)
  const validatedLinks = rawLinks.filter((link: any): link is Link => 
      link && 
      typeof link.id === 'number' && 
      typeof link.name === 'string' && 
      typeof link.original === 'string' &&
      typeof link.converted === 'string' &&
      typeof link.category === 'string' &&
      typeof link.createdAt === 'string'
  ).map(link => ({ // Add .map here to normalize category
      ...link,
      category: link.category.toLowerCase() // Normalize category to lowercase
  }));
  return validatedLinks;
}

async function getCategories(): Promise<string[]> {
  const categoriesRef = ref(database, 'categories');
  const snapshot = await get(categoriesRef);
  if (!snapshot.exists()) {
    return [];
  }
  const rawCategories: any[] = Array.isArray(snapshot.val()) ? snapshot.val() : [];
  // Validate categories
  const categories: string[] = Array.from(
    new Set(
      rawCategories
        .map(cat => typeof cat === 'string' ? cat.trim() : '')
        .filter(cat => cat !== '')
    )
  );
  return categories;
}

async function getLinksData(): Promise<LinksData> {
  console.log('Attempting to read from Firebase paths: /links and /categories');
  try {
    // Fetch links and categories in parallel
    const [links, categories] = await Promise.all([
      getLinks(),
      getCategories()
    ]);

    const structuredData: LinksData = { links, categories };
    console.log('Returning combined structured data:', JSON.stringify(structuredData, null, 2));
    return structuredData;

  } catch (error) {
    console.error('Error reading from Firebase in getLinksData:', error);
    throw error;
  }
}

async function saveLinks(links: Link[]) {
  try {
    const linksRef = ref(database, 'links');
    console.log('Saving links to Firebase path /links:', links);
    // Convert array to object for Firebase if preferred, or save as array
    // const linksObject = links.reduce((acc, link) => ({...acc, [link.id]: link }), {});
    // await set(linksRef, linksObject); // Use this line if saving as object
    await set(linksRef, links); // Saving as array
    console.log('Links saved successfully');
  } catch (error) {
    console.error('Error writing links to Firebase:', error);
    throw new Error('Failed to save links data to Firebase');
  }
}

async function saveCategories(categories: string[]) {
  try {
    const categoriesRef = ref(database, 'categories');
    // Ensure uniqueness and filter empty strings again before saving
    const validCategories = Array.from(new Set(categories.filter(c => typeof c === 'string' && c.trim() !== '')));
    console.log('Saving categories to Firebase path /categories:', validCategories);
    await set(categoriesRef, validCategories);
    console.log('Categories saved successfully');
  } catch (error) {
    console.error('Error writing categories to Firebase:', error);
    throw new Error('Failed to save categories data to Firebase');
  }
}

export async function GET() {
  try {
    console.log('GET /api/links request received');
    // Now uses the updated getLinksData which reads from both paths
    const data = await getLinksData(); 
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/links:', error);
    return NextResponse.json({
      error: 'Failed to read links data',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // !!! THIS FUNCTION NEEDS UPDATING !!!
  try {
    const { original, name, category } = await request.json()
    
    if (!original || !name) {
      return NextResponse.json({ error: 'Original URL and name are required' }, { status: 400 })
    }

    // Fetch current data (links and categories separately)
    const currentLinks = await getLinks();
    const currentCategories = await getCategories();

    const linkCategory = category || 'Uncategorized' // Determine the category first

    // Filter links by the current category to find the max ID within that category
    const linksInCurrentCategory = currentLinks.filter(link => link.category === linkCategory);

    // Calculate newId based on links in the specific category
    const newId = linksInCurrentCategory.length > 0
      ? Math.max(...linksInCurrentCategory.map(l => l.id)) + 1
      : 1;

    const convertedUrl = `/api/stream/${linkCategory.toLowerCase()}/${newId}`

    const newLink: Link = {
      id: newId,
      name,
      original,
      converted: convertedUrl,
      category: linkCategory.toLowerCase(),
      createdAt: new Date().toISOString()
    }

    // Update links array
    const updatedLinks = [...currentLinks, newLink];

    // Update categories array if new category added
    let updatedCategories = [...currentCategories];
    if (linkCategory !== 'Uncategorized' && !currentCategories.includes(linkCategory)) {
      updatedCategories.push(linkCategory);
    }

    // Save links and categories separately
    await saveLinks(updatedLinks);
    // Only save categories if they actually changed
    if (updatedCategories.length !== currentCategories.length) {
        await saveCategories(updatedCategories);
    }

    return NextResponse.json(newLink);
  } catch (error) {
    console.error('Error in POST /api/links:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  // !!! THIS FUNCTION NEEDS UPDATING !!!
  try {
    const { linksToDelete } = await request.json(); // Expect array of { id: number, category: string }

    if (!Array.isArray(linksToDelete)) {
      return NextResponse.json({ error: 'Links to delete must be an array' }, { status: 400 });
    }

    // Fetch current links
    const currentLinks = await getLinks();
    const originalLength = currentLinks.length;
    
    // Filter links: keep only those not in the linksToDelete array (matching both id and category)
    const updatedLinks = currentLinks.filter(currentLink => 
      !linksToDelete.some(linkToDelete => 
        linkToDelete.id === currentLink.id && linkToDelete.category === currentLink.category
      )
    );

    // Recalculate categories from remaining links
    // const remainingCategories = Array.from(new Set(updatedLinks.map(link => link.category).filter(c => c !== 'uncategorized')));

    // Save updated links
    await saveLinks(updatedLinks);
    // Removed automatic saving of categories here
    // await saveCategories(remainingCategories);

    return NextResponse.json({
      message: `Deleted ${originalLength - updatedLinks.length} links`,
    })
  } catch (error) {
    console.error('Error deleting links:', error); // Added logging
    return NextResponse.json({ error: 'Failed to delete links' }, { status: 500 })
  }
} 