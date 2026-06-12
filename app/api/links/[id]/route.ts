import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = getDB();
    const linkId = parseInt(id);
    const category = (body.originalCategory || body.category || '').toLowerCase();

    if (!category) {
      return NextResponse.json({ error: 'Category is required to locate the link' }, { status: 400 });
    }

    const linkRef = ref(db, `/${category}/${linkId}`);
    const snapshot = await get(linkRef);
    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const currentLink = { ...snapshot.val() };

    if (body.name !== undefined) {
      currentLink.name = body.name;
    }

    if (body.newCategory !== undefined && body.newCategory.toLowerCase() !== category) {
      // Move link to new category
      const newCat = body.newCategory.toLowerCase();
      currentLink.category = newCat;
      currentLink.converted = `/api/stream/${newCat}/${linkId}`;
      await set(ref(db, `/${newCat}/${linkId}`), currentLink);
      await set(linkRef, null); // Remove from old category
      return NextResponse.json(currentLink);
    }

    if (body.original !== undefined) {
      currentLink.original = body.original;
    }

    await set(linkRef, currentLink);
    return NextResponse.json(currentLink);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update link', details: error.message }, { status: 500 });
  }
}
