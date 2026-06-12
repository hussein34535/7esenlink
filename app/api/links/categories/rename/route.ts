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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { oldName, newName } = body;

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'oldName and newName are required' }, { status: 400 });
    }

    const data = await getLinksData();

    // Update categories array
    if (data.categories) {
      data.categories = data.categories.map((c: string) => c.toLowerCase() === oldName.toLowerCase() ? newName : c);
    }

    // Update links having this category
    if (data.links) {
      data.links = data.links.map((link: any) => {
        if (link.category.toLowerCase() === oldName.toLowerCase()) {
          return {
            ...link,
            category: newName,
            converted: `/api/stream/${newName.toLowerCase()}/${link.id}`
          };
        }
        return link;
      });
    }

    await saveLinksData(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to rename category', details: error.message }, { status: 500 });
  }
}
