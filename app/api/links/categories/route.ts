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
    return NextResponse.json(data.categories || []);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to read categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await getLinksData();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!data.categories) data.categories = [];
    if (!data.categories.includes(name)) {
      data.categories.push(name);
      await saveLinksData(data);
    }
    return NextResponse.json(data.categories);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create category', details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const categories = await req.json();
    const data = await getLinksData();
    
    data.categories = categories;
    await saveLinksData(data);
    return NextResponse.json(data.categories);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update categories', details: error.message }, { status: 500 });
  }
}
