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
    const { findText, replaceText, category } = body;

    if (!findText) {
      return NextResponse.json({ error: 'findText is required' }, { status: 400 });
    }

    const db = getDB();
    const snapshot = await get(ref(db, '/categories'));
    const categories: string[] = snapshot.exists() ? snapshot.val() : [];
    let count = 0;

    const targetCategories = category === 'all' ? categories : [category.toLowerCase()];

    for (const cat of targetCategories) {
      const catSnap = await get(ref(db, `/${cat}`));
      if (!catSnap.exists()) continue;

      const links = catSnap.val();
      for (const [id, link] of Object.entries<any>(links)) {
        if (link.original && link.original.includes(findText)) {
          const updatedOriginal = link.original.replaceAll(findText, replaceText || '');
          await set(ref(db, `/${cat}/${id}/original`), updatedOriginal);
          count++;
        }
      }
    }

    return NextResponse.json({ success: true, message: `تم استبدال النص في عدد ${count} من الروابط بنجاح.` });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to replace text', details: error.message }, { status: 500 });
  }
}
