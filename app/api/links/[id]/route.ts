import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = getAdminDB();
    const linkId = id;
    const category = (body.originalCategory || body.category || '').toLowerCase();

    if (!category) {
      return NextResponse.json({ error: 'Category is required to locate the link' }, { status: 400 });
    }

    const linkSnap = await db.ref(`/${category}/${linkId}`).once('value');
    if (!linkSnap.exists()) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const currentLink = { ...linkSnap.val() };

    if (body.name !== undefined) {
      currentLink.name = body.name;
    }

    if (body.newCategory !== undefined && body.newCategory.toLowerCase() !== category) {
      const newCat = body.newCategory.toLowerCase();
      currentLink.category = newCat;
      currentLink.converted = `/api/stream/${newCat}/${linkId}`;
      await db.ref(`/${newCat}/${linkId}`).set(currentLink);
      await db.ref(`/${category}/${linkId}`).remove();
      return NextResponse.json(currentLink);
    }

    if (body.original !== undefined) {
      currentLink.original = body.original;
    }

    await db.ref(`/${category}/${linkId}`).set(currentLink);
    return NextResponse.json(currentLink);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update link', details: error.message }, { status: 500 });
  }
}
