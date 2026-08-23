import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderedIds: string[] = body.categories || [];
    const db = getAdminDB();
    await db.ref('/categories').set(orderedIds);
    return NextResponse.json({ success: true, count: orderedIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to reorder', details: error.message }, { status: 500 });
  }
}
