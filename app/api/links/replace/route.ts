import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { findText, replaceText, category } = body;

    if (!findText) {
      return NextResponse.json({ error: 'findText is required' }, { status: 400 });
    }

    const db = getAdminDB();
    const catSnap = await db.ref('/categories').once('value');
    const categories: string[] = catSnap.exists() ? catSnap.val() : [];
    let count = 0;

    const targetCategories = category === 'all' ? categories : [category.toLowerCase()];

    for (const cat of targetCategories) {
      const snap = await db.ref(`/${cat}`).once('value');
      if (!snap.exists()) continue;

      const links = snap.val();
      for (const [id, link] of Object.entries<any>(links)) {
        if (link.original && link.original.includes(findText)) {
          const updated = link.original.replaceAll(findText, replaceText || '');
          await db.ref(`/${cat}/${id}/original`).set(updated);
          count++;
        }
      }
    }

    return NextResponse.json({ success: true, message: `تم استبدال النص في عدد ${count} من الروابط بنجاح.` });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to replace text', details: error.message }, { status: 500 });
  }
}
