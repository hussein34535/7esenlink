import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

const filePath = join(process.cwd(), 'data', 'links.json');

async function getLinksData() {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return { links: [], categories: [] };
  }
}

async function saveLinksData(data: any) {
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await getLinksData();
    const linkId = parseInt(id);

    const index = data.links.findIndex((l: any) => l.id === linkId);
    if (index === -1) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const currentLink = data.links[index];

    if (body.name !== undefined) {
      currentLink.name = body.name;
    }

    if (body.newCategory !== undefined) {
      currentLink.category = body.newCategory;
      currentLink.converted = `/api/stream/${body.newCategory.toLowerCase()}/${currentLink.id}`;
    }

    if (body.original !== undefined) {
      currentLink.original = body.original;
    }

    data.links[index] = currentLink;
    await saveLinksData(data);

    return NextResponse.json(currentLink);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update link', details: error.message }, { status: 500 });
  }
}
