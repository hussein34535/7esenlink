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

export async function GET() {
  try {
    const db = getDB();
    const snapshot = await get(ref(db, '/categories'));
    const categories = snapshot.exists() ? snapshot.val() : [];
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to read categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getDB();
    const name = body.name?.trim()?.toLowerCase();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const snapshot = await get(ref(db, '/categories'));
    const categories: string[] = snapshot.exists() ? snapshot.val() : [];

    if (!categories.includes(name)) {
      categories.push(name);
      await set(ref(db, '/categories'), categories);
    }
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create category', details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const db = getDB();
    const categories = await req.json();
    await set(ref(db, '/categories'), categories);
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update categories', details: error.message }, { status: 500 });
  }
}
