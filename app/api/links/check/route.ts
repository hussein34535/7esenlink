import { NextResponse } from 'next/server';

// Lightweight liveness check for stream URLs.
//
// Body: { items: [{ key: string, url: string }] }
// For each URL we fetch headers + first byte only (Range: bytes=0-0) with a
// short timeout, then abort — a few hundred bytes per URL, nothing noticeable.
// Checked in small concurrent batches. Used by the admin table to show a
// red/green dot per link.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const items: Array<{ key: string; url: string }> = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ results: {} });
    }
    if (items.length > 500) {
      return NextResponse.json({ error: 'Too many items (max 500)' }, { status: 400 });
    }

    const results: Record<string, 'alive' | 'dead'> = {};
    const BATCH = 6;

    const checkOne = async (item: { key: string; url: string }) => {
      if (!item.url || !/^https?:\/\//i.test(item.url)) {
        results[item.key] = 'dead';
        return;
      }
      try {
        const res = await fetch(item.url, {
          method: 'GET',
          headers: { Range: 'bytes=0-0', 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18', Accept: '*/*' },
          signal: AbortSignal.timeout(5000),
          redirect: 'follow',
        });
        try { await res.body?.cancel(); } catch { /* ignore */ }
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        const isStream = ct.includes('mpegurl') || ct.includes('m3u') || ct.includes('video') || ct.includes('mp2t') || ct.includes('octet-stream');
        results[item.key] = res.status < 400 && isStream ? 'alive' : 'dead';
      } catch {
        results[item.key] = 'dead';
      }
    };

    for (let i = 0; i < items.length; i += BATCH) {
      await Promise.all(items.slice(i, i + BATCH).map(checkOne));
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error('links/check error:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
