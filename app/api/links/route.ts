import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

async function getAllData() {
  const db = getAdminDB();
  const snapshot = await db.ref('/').once('value');
  if (!snapshot.exists()) return { links: [], categories: [] };

  const raw = snapshot.val();
  const categories: string[] = Array.isArray(raw.categories)
    ? raw.categories
    : Object.keys(raw.categories || {});

  const links: any[] = [];
  for (const category of categories) {
    const catLinks = raw[category];
    if (catLinks && typeof catLinks === 'object') {
      const entries = Object.entries<any>(catLinks);

      for (const [id, link] of entries) {
        if (!link) continue;
        links.push({
          id: link.id || Number(id) || id,
          name: link.name,
          original: link.original,
          converted: link.converted || `/api/stream/${category}/${link.id || id}`,
          category,
          createdAt: link.createdAt || new Date().toISOString(),
        });
      }
    }
  }

  return { links, categories };
}

export async function GET() {
  try {
    const data = await getAllData();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to read data', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getAdminDB();
    const category = (body.category || 'uncategorized').toLowerCase();

    const catSnap = await db.ref(`/${category}`).once('value');
    const existing = catSnap.exists() ? catSnap.val() : {};
    
    // Safety check for array/nulls when finding maxId
    const existingList = Array.isArray(existing) ? existing : Object.values<any>(existing || {});
    const validLinks = existingList.filter((l: any) => l !== null && l !== undefined);
    
    const maxId =
      validLinks.length > 0
        ? Math.max(...validLinks.map((l: any) => l.id || 0))
        : 0;

    const newId = maxId + 1;
    const newLink = {
      id: newId,
      name: body.name || 'Unnamed Link',
      original: body.original || '',
      converted: `/api/stream/${category}/${newId}`,
      category,
      createdAt: new Date().toISOString(),
    };

    await db.ref(`/${category}/${newId}`).set(newLink);

    const catListSnap = await db.ref('/categories').once('value');
    const catList: string[] = catListSnap.exists() ? catListSnap.val() : [];
    if (!catList.includes(category)) {
      catList.push(category);
      await db.ref('/categories').set(catList);
    }

    return NextResponse.json(newLink);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add link', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const db = getAdminDB();
    const linksToDelete: { id: number; category: string }[] = body.linksToDelete || [];

    for (const { id, category } of linksToDelete) {
      await db.ref(`/${category}/${id}`).remove();
    }

    return NextResponse.json({ success: true, count: linksToDelete.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete links', details: error.message }, { status: 500 });
  }
}
