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

function parseM3U(m3uContent: string) {
  const lines = m3uContent.split('\n');
  const results: { name: string; url: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch && nameMatch[1] && i + 1 < lines.length) {
        const name = nameMatch[1].trim();
        const url = lines[i + 1].trim();
        if (url && !url.startsWith('#')) {
          results.push({ name, url });
          i++; // skip next line as it was parsed
        }
      }
    }
  }
  return results;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const category = formData.get('category') as string || 'Uncategorized';
    
    let m3uContent = '';

    const m3uFile = formData.get('m3uFile') as File | null;
    const m3uUrl = formData.get('m3uUrl') as string | null;
    const m3uContentParam = formData.get('m3uContent') as string | null;

    if (m3uFile) {
      m3uContent = await m3uFile.text();
    } else if (m3uContentParam) {
      m3uContent = m3uContentParam;
    } else if (m3uUrl) {
      // fetch content
      const fetchRes = await fetch(m3uUrl);
      if (fetchRes.ok) {
        m3uContent = await fetchRes.text();
      } else {
        return NextResponse.json({ error: 'Failed to fetch M3U URL' }, { status: 400 });
      }
    }

    if (!m3uContent) {
      return NextResponse.json({ error: 'No M3U content found' }, { status: 400 });
    }

    const parsedLinks = parseM3U(m3uContent);
    if (parsedLinks.length === 0) {
      return NextResponse.json({ error: 'No valid channels found in M3U' }, { status: 400 });
    }

    const data = await getLinksData();

    // Check if category exists, if not add it
    if (!data.categories) data.categories = [];
    if (!data.categories.map((c: string) => c.toLowerCase()).includes(category.toLowerCase())) {
      data.categories.push(category);
    }

    let maxId = data.links.reduce((max: number, link: any) => link.id > max ? link.id : max, 0);

    const newLinks = parsedLinks.map((pl) => {
      maxId++;
      return {
        id: maxId,
        name: pl.name,
        original: pl.url,
        converted: `/api/stream/${category.toLowerCase()}/${maxId}`,
        category: category,
        createdAt: new Date().toISOString()
      };
    });

    data.links.push(...newLinks);
    await saveLinksData(data);

    return NextResponse.json({ success: true, count: newLinks.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to import M3U content', details: error.message }, { status: 500 });
  }
}
