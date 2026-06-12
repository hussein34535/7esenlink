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

function parseM3U(m3uContent: string) {
  const lines = m3uContent.split('\n');
  const results: { name: string; url: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch && nameMatch[1] && i + 1 < lines.length) {
        const name = nameMatch[1].trim();
        const url = lines[i + 1].trim();
        if (url && !url.startsWith('#')) {
          results.push({ name, url });
          i++; // skip next line as it was parsed
        }
      }
    }
  }
  return results;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const category = ((formData.get('category') as string) || 'Uncategorized').toLowerCase();

    let m3uContent = '';
    const m3uFile = formData.get('m3uFile') as File | null;
    const m3uUrl = formData.get('m3uUrl') as string | null;
    const m3uContentParam = formData.get('m3uContent') as string | null;

    if (m3uFile) {
      m3uContent = await m3uFile.text();
    } else if (m3uContentParam) {
      m3uContent = m3uContentParam;
    } else if (m3uUrl) {
      const fetchRes = await fetch(m3uUrl);
      if (fetchRes.ok) {
        m3uContent = await fetchRes.text();
      } else {
        return NextResponse.json({ error: 'Failed to fetch M3U URL' }, { status: 400 });
      }
    }

    if (!m3uContent) {
      return NextResponse.json({ error: 'No M3U content found' }, { status: 400 });
    }

    const parsedLinks = parseM3U(m3uContent);
    if (parsedLinks.length === 0) {
      return NextResponse.json({ error: 'No valid channels found in M3U' }, { status: 400 });
    }

    const db = getDB();

    // Get current category links to determine max id
    const catSnap = await get(ref(db, `/${category}`));
    const existing = catSnap.exists() ? catSnap.val() : {};
    const existingIds = Object.values<any>(existing).map((l: any) => l.id || 0);
    let maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;

    // Write all new links to Firebase
    for (const pl of parsedLinks) {
      maxId++;
      const newLink = {
        id: maxId,
        name: pl.name,
        original: pl.url,
        converted: `/api/stream/${category}/${maxId}`,
        category,
        createdAt: new Date().toISOString(),
      };
      await set(ref(db, `/${category}/${maxId}`), newLink);
    }

    // Ensure category is in categories list
    const catListSnap = await get(ref(db, '/categories'));
    const catList: string[] = catListSnap.exists() ? catListSnap.val() : [];
    if (!catList.map((c: string) => c.toLowerCase()).includes(category)) {
      catList.push(category);
      await set(ref(db, '/categories'), catList);
    }

    return NextResponse.json({ success: true, count: parsedLinks.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to import M3U content', details: error.message }, { status: 500 });
  }
}
