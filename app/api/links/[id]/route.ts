import { NextResponse } from 'next/server'
import { database } from '@/lib/firebase'
import { ref, get, set } from 'firebase/database'

// Link interface (should be consistent across all API routes)
interface Link {
  id: number;
  name: string;
  original: string;
  converted: string;
  category: string;
  createdAt: string;
}

// Re-use getLinks function from app/api/links/route.ts
async function getLinks(): Promise<Link[]> {
  const linksRef = ref(database, 'links');
  const snapshot = await get(linksRef);
  if (!snapshot.exists()) {
    return [];
  }
  const rawLinks: any[] = Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val());
  const validatedLinks = rawLinks.filter((link: any): link is Link =>
    link &&
    typeof link.id === 'number' &&
    typeof link.name === 'string' &&
    typeof link.original === 'string' &&
    typeof link.converted === 'string' &&
    typeof link.category === 'string' &&
    typeof link.createdAt === 'string'
  );
  return validatedLinks;
}

// Re-use saveLinks function from app/api/links/route.ts
async function saveLinks(links: Link[]) {
  try {
    const linksRef = ref(database, 'links');
    await set(linksRef, links);
  } catch (error) {
    console.error('Error writing links to Firebase:', error);
    throw new Error('Failed to save links data to Firebase');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const linkId = parseInt(params.id);
    const body = await request.json();
    const { originalCategory, newCategory, newName } = body;

    if (isNaN(linkId)) {
      return NextResponse.json(
        { error: 'Invalid ID provided' },
        { status: 400 }
      );
    }

    // Require originalCategory for finding the link
    if (!originalCategory || typeof originalCategory !== 'string') {
      return NextResponse.json(
        { error: 'originalCategory is required' },
        { status: 400 }
      );
    }

    const currentLinks = await getLinks();

    // Find the link by both id and its original category
    const linkIndex = currentLinks.findIndex(link => link.id === linkId && link.category === originalCategory);

    if (linkIndex === -1) {
      return NextResponse.json(
        { error: 'Link not found with the provided ID and category' },
        { status: 404 }
      );
    }

    // Create an updated link object
    const updatedLink = { ...currentLinks[linkIndex] };

    // Update name if provided
    if (newName && typeof newName === 'string') {
      updatedLink.name = newName;
    }

    // Update category if provided
    if (newCategory && typeof newCategory === 'string') {
      updatedLink.category = newCategory;
      updatedLink.converted = `/api/stream/${newCategory.toLowerCase()}/${linkId}`;
    }

    // Replace the old link with the updated link
    currentLinks[linkIndex] = updatedLink;

    await saveLinks(currentLinks);

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // This endpoint is effectively deprecated for single link deletion by ID alone
    // as IDs are no longer globally unique. The plural /api/links DELETE handles
    // category-aware deletion from the frontend.
    return NextResponse.json({ error: 'This endpoint is not implemented for category-aware single link deletion.' }, { status: 405 });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    );
  }
} 