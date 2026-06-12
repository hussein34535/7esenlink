import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ category: string; id: string }> }
) {
  try {
    const { category, id } = await params;
    const db = getAdminDB();
    const snapshot = await db.ref(`/${category}/${id}`).once('value');

    if (!snapshot.exists()) {
      return new Response('Stream Not Found', { status: 404 });
    }

    const link = snapshot.val();
    if (!link?.original) {
      return new Response('Stream Not Found', { status: 404 });
    }

    return NextResponse.redirect(link.original, { status: 307 });
  } catch (error: any) {
    return new Response('Internal Server Error', { status: 500 });
  }
}
