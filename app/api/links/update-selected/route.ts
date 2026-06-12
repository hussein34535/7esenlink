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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { linkIds, m3uContent } = body; // linkIds are composite keys like 'category-id'

    if (!linkIds || !m3uContent) {
      return NextResponse.json({ error: 'linkIds and m3uContent are required' }, { status: 400 });
    }

    // Parse the M3U content to extract URLs
    const lines = m3uContent.split('\n');
    const urls = lines
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && !line.startsWith('#'));

    if (urls.length !== linkIds.length) {
      return NextResponse.json({
        error: `عدد الروابط المكتشفة في ملف M3U (${urls.length}) لا يتطابق مع عدد القنوات المحددة (${linkIds.length}).`
      }, { status: 400 });
    }

    const db = getDB();

    for (let i = 0; i < linkIds.length; i++) {
      const compositeKey = linkIds[i];
      const [category, idStr] = compositeKey.split('-');
      const id = parseInt(idStr);
      await set(ref(db, `/${category}/${id}/original`), urls[i]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update links', details: error.message }, { status: 500 });
  }
}
