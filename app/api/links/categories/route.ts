import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const db = getAdminDB();
    const snapshot = await db.ref('/categories').once('value');
    const categories = snapshot.exists() ? snapshot.val() : [];
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to read categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getAdminDB();
    const name = body.name?.trim()?.toLowerCase();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const snapshot = await db.ref('/categories').once('value');
    const categories: string[] = snapshot.exists() ? snapshot.val() : [];

    if (!categories.includes(name)) {
      categories.push(name);
      await db.ref('/categories').set(categories);
    }
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create category', details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const db = getAdminDB();
    const categories = await req.json();
    await db.ref('/categories').set(categories);
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update categories', details: error.message }, { status: 500 });
  }
}
