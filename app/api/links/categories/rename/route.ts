import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { oldName, newName } = body;

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'oldName and newName are required' }, { status: 400 });
    }

    const db = getAdminDB();
    const old = oldName.toLowerCase();
    const next = newName.toLowerCase();

    // Update categories list
    const catSnap = await db.ref('/categories').once('value');
    const categories: string[] = catSnap.exists() ? catSnap.val() : [];
    const updatedCats = categories.map((c: string) =>
      c.toLowerCase() === old ? next : c
    );
    await db.ref('/categories').set(updatedCats);

    // Move links from old category to new
    const oldCatSnap = await db.ref(`/${old}`).once('value');
    if (oldCatSnap.exists()) {
      const oldLinks = oldCatSnap.val();
      const updatedLinks: Record<string, any> = {};
      for (const [id, link] of Object.entries<any>(oldLinks)) {
        updatedLinks[id] = {
          ...link,
          category: next,
          converted: `/api/stream/${next}/${link.id || id}`,
        };
      }
      await db.ref(`/${next}`).set(updatedLinks);
      await db.ref(`/${old}`).remove();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to rename category', details: error.message }, { status: 500 });
  }
}
