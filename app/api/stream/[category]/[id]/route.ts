import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

const filePath = join(process.cwd(), 'data', 'links.json');

async function getLinksData() {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return { links: [] };
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ category: string; id: string }> }
) {
  try {
    const { id } = await params;
    const linkId = parseInt(id);
    const data = await getLinksData();

    const link = data.links.find((l: any) => l.id === linkId);

    if (!link || !link.original) {
      return new Response('Stream Not Found', { status: 404 });
    }

    return NextResponse.redirect(link.original);
  } catch (error: any) {
    return new Response('Internal Server Error', { status: 500 });
  }
}
