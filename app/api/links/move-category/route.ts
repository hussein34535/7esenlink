import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

// Bulk move links to another category.
//
// Body: { links: [{ id: number, category: string }], newCategory: string }
// Moves each link node in Firebase: /<old>/<id> -> /<new>/<id> and rewrites
// its `category` + `converted` fields. Used by the subtle bulk editor in the
// selected-actions bar.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const links: Array<{ id: number; category: string }> = Array.isArray(body.links) ? body.links : [];
    const newCategory = String(body.newCategory || '').trim().toLowerCase();

    if (links.length === 0 || !newCategory) {
      return NextResponse.json({ error: 'links and newCategory are required' }, { status: 400 });
    }
    if (links.length > 500) {
      return NextResponse.json({ error: 'Too many links (max 500)' }, { status: 400 });
    }

    const db = getAdminDB();
    let moved = 0;

    for (const item of links) {
      const id = Number(item.id);
      const oldCat = String(item.category || '').trim().toLowerCase();
      if (!Number.isFinite(id) || !oldCat || oldCat === newCategory) continue;

      const snap = await db.ref(`/${oldCat}/${id}`).once('value');
      if (!snap.exists()) continue;

      const current = { ...(snap.val() as Record<string, unknown>) };
      current.category = newCategory;
      current.converted = `/api/stream/${newCategory}/${id}`;
      await db.ref(`/${newCategory}/${id}`).set(current);
      await db.ref(`/${oldCat}/${id}`).remove();
      moved++;
    }

    return NextResponse.json({ success: true, moved });
  } catch (error: unknown) {
    console.error('links/move-category error:', error);
    return NextResponse.json(
      { error: 'Move failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
