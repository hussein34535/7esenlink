import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ category: string; id: string }> }
) {
  try {
    const { category, id } = await params;
    const db = getDB();
    const snapshot = await get(ref(db, `/${category}/${id}`));

    if (!snapshot.exists()) {
      return new Response('Stream Not Found', { status: 404 });
    }

    const link = snapshot.val();
    if (!link?.original) {
      return new Response('Stream Not Found', { status: 404 });
    }

    return NextResponse.redirect(link.original, { status: 307 });
  } catch (error: any) {
    return new Response('Internal Server Error', { status: 500 });
  }
}
