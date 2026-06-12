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

export async function GET() {
  try {
    const data = await getLinksData();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to read data', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await getLinksData();
    
    const maxId = data.links.reduce((max: number, link: any) => link.id > max ? link.id : max, 0);
    const newLink = {
      id: maxId + 1,
      name: body.name || 'Unnamed Link',
      original: body.original || '',
      converted: `/api/stream/${(body.category || 'uncategorized').toLowerCase()}/${maxId + 1}`,
      category: body.category || 'uncategorized',
      createdAt: new Date().toISOString()
    };

    data.links.push(newLink);
    await saveLinksData(data);
    return NextResponse.json(newLink);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add link', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const data = await getLinksData();
    
    const linksToDelete = body.linksToDelete || [];
    const deleteIds = linksToDelete.map((l: any) => l.id);

    data.links = data.links.filter((link: any) => !deleteIds.includes(link.id));
    await saveLinksData(data);
    
    return NextResponse.json({ success: true, count: deleteIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete links', details: error.message }, { status: 500 });
  }
}
