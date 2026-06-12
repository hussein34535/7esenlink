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
    const { oldName, newName } = body;

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'oldName and newName are required' }, { status: 400 });
    }

    const db = getDB();

    // Rename in categories list
    const catSnap = await get(ref(db, '/categories'));
    const categories: string[] = catSnap.exists() ? catSnap.val() : [];
    const updatedCats = categories.map((c: string) =>
      c.toLowerCase() === oldName.toLowerCase() ? newName.toLowerCase() : c
    );
    await set(ref(db, '/categories'), updatedCats);

    // Move all links from old category to new category in Firebase
    const oldCatSnap = await get(ref(db, `/${oldName.toLowerCase()}`));
    if (oldCatSnap.exists()) {
      const oldLinks = oldCatSnap.val();
      // Update each link's category and converted url
      const updatedLinks: Record<string, any> = {};
      for (const [id, link] of Object.entries<any>(oldLinks)) {
        updatedLinks[id] = {
          ...link,
          category: newName.toLowerCase(),
          converted: `/api/stream/${newName.toLowerCase()}/${link.id || id}`,
        };
      }
      await set(ref(db, `/${newName.toLowerCase()}`), updatedLinks);
      await set(ref(db, `/${oldName.toLowerCase()}`), null); // Delete old
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to rename category', details: error.message }, { status: 500 });
  }
}
