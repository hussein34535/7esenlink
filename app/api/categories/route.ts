import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const db = getAdminDB();
    const snapshot = await db.ref('/categories').once('value');
    const categories = snapshot.exists() ? snapshot.val() : [];
    // Return as array of {id, name} objects
    const result = (Array.isArray(categories) ? categories : Object.values(categories)).map((name: string, i: number) => ({
      id: name,
      name: name,
    }));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to read categories', details: error.message }, { status: 500 });
  }
}
