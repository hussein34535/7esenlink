import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, set, push } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getDB() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getDatabase();
}

async function getAllData() {
  const db = getDB();
  const snapshot = await get(ref(db, '/'));
  if (!snapshot.exists()) return { links: [], categories: [] };

  const raw = snapshot.val();
  const categories: string[] = Array.isArray(raw.categories) ? raw.categories : Object.keys(raw.categories || {});

  const links: any[] = [];
  for (const category of categories) {
    const catLinks = raw[category];
    if (catLinks && typeof catLinks === 'object') {
      for (const [id, link] of Object.entries<any>(catLinks)) {
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

  console.log('Returning combined structured data:', JSON.stringify({ links: links.slice(0, 3), categories: categories.slice(0, 3) }));
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
    const db = getDB();
    const category = (body.category || 'uncategorized').toLowerCase();

    const catRef = ref(db, `/${category}`);
    const snapshot = await get(catRef);
    const existing = snapshot.exists() ? snapshot.val() : {};
    const maxId = Object.keys(existing).length > 0
      ? Math.max(...Object.values<any>(existing).map((l: any) => l.id || 0))
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

    await set(ref(db, `/${category}/${newId}`), newLink);

    // Ensure category is in categories list
    const catListSnap = await get(ref(db, '/categories'));
    const catList: string[] = catListSnap.exists() ? catListSnap.val() : [];
    if (!catList.includes(category)) {
      catList.push(category);
      await set(ref(db, '/categories'), catList);
    }

    return NextResponse.json(newLink);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add link', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const db = getDB();
    const linksToDelete: { id: number; category: string }[] = body.linksToDelete || [];

    for (const { id, category } of linksToDelete) {
      await set(ref(db, `/${category}/${id}`), null);
    }

    return NextResponse.json({ success: true, count: linksToDelete.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete links', details: error.message }, { status: 500 });
  }
}
