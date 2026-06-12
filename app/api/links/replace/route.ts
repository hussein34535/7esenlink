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
    const { findText, replaceText, category } = body;

    if (!findText) {
      return NextResponse.json({ error: 'findText is required' }, { status: 400 });
    }

    const data = await getLinksData();
    let count = 0;

    data.links = data.links.map((link: any) => {
      const matchCategory = category === 'all' || link.category.toLowerCase() === category.toLowerCase();
      if (matchCategory && link.original.includes(findText)) {
        count++;
        return {
          ...link,
          original: link.original.replaceAll(findText, replaceText || '')
        };
      }
      return link;
    });

    await saveLinksData(data);
    return NextResponse.json({ success: true, message: `تم استبدال النص في عدد ${count} من الروابط بنجاح.` });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to replace text', details: error.message }, { status: 500 });
  }
}
