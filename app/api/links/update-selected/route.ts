import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { linkIds, m3uContent } = body;

    if (!linkIds || !m3uContent) {
      return NextResponse.json({ error: 'linkIds and m3uContent are required' }, { status: 400 });
    }

    const lines = m3uContent.split('\n');
    const urls = lines
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && !line.startsWith('#'));

    if (urls.length !== linkIds.length) {
      return NextResponse.json({
        error: `عدد الروابط المكتشفة في ملف M3U (${urls.length}) لا يتطابق مع عدد القنوات المحددة (${linkIds.length}).`
      }, { status: 400 });
    }

    const db = getAdminDB();

    for (let i = 0; i < linkIds.length; i++) {
      const [category, idStr] = linkIds[i].split('-');
      await db.ref(`/${category}/${idStr}/original`).set(urls[i]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update links', details: error.message }, { status: 500 });
  }
}
