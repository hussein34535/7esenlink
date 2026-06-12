import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

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
          i++;
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

    const db = getAdminDB();
    const catSnap = await db.ref(`/${category}`).once('value');
    const existing = catSnap.exists() ? catSnap.val() : {};
    const existingList = Array.isArray(existing) ? existing : Object.values<any>(existing || {});
    const validLinks = existingList.filter((l: any) => l !== null && l !== undefined);
    const existingIds = validLinks.map((l: any) => l.id || 0);
    let maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;

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
      await db.ref(`/${category}/${maxId}`).set(newLink);
    }

    // Ensure category exists in categories list
    const catListSnap = await db.ref('/categories').once('value');
    const catList: string[] = catListSnap.exists() ? catListSnap.val() : [];
    if (!catList.map((c: string) => c.toLowerCase()).includes(category)) {
      catList.push(category);
      await db.ref('/categories').set(catList);
    }

    return NextResponse.json({ success: true, count: parsedLinks.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to import M3U content', details: error.message }, { status: 500 });
  }
}
