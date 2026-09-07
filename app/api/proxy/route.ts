import { NextRequest, NextResponse } from 'next/server';

// HLS proxy for the built-in test player.
//
// The admin dashboard player (VideoPlayer with "Bypass Restrictions" enabled)
// routes m3u8 playback through this endpoint. It:
//  - forwards the request to the upstream playlist/segment
//  - rewrites nested playlist URIs and segment paths to absolute URLs that
//    keep flowing through this same proxy (so relative paths and redirects
//    inside playlists keep working)
//  - passes through Range headers and streaming responses untouched
//
// Open to same-origin admin usage. The upstream can be any http(s) URL; this
// endpoint is only linked from the admin UI player, no secrets involved.

const ALLOW_UPSTREAM_HOSTS_SUFFIX = [
  '7esentv.com',
  '7esenlink.vercel.app',
  'none-arrt-a6-ak.click',
  'boss-noss45.shop',
  'gemini.media',
];

function isAllowedUpstream(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return false;
    return ALLOW_UPSTREAM_HOSTS_SUFFIX.some((s) => u.hostname === s || u.hostname.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

function absolutize(base: string, candidate: string): string | null {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

function rewritePlaylist(body: string, requestUrl: string): string {
  const lines = body.split('\n');
  const out: string[] = [];
  for (const lineRaw of lines) {
    const line = lineRaw.replace(/\r$/, '');
    const trimmed = line.trim();

    if (!trimmed) {
      out.push(line);
      continue;
    }

    if (trimmed.startsWith('#')) {
      // Rewrite URI="..." attributes inside tags (#EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA, ...)
      const rewritten = line.replace(/URI="([^"]+)"/g, (_m, uri) => {
        const abs = absolutize(requestUrl, uri);
        return abs ? `URI="${proxyUrl(abs)}"` : `URI="${uri}"`;
      });
      out.push(rewritten);
      continue;
    }

    // Non-comment line = playlist URI or segment path
    const abs = absolutize(requestUrl, trimmed);
    out.push(abs ? proxyUrl(abs) : line);
  }
  return out.join('\n');
}

function proxyUrl(upstream: string): string {
  return `/api/proxy?url=${encodeURIComponent(upstream)}`;
}

// Stream URLs played from the admin dashboard often carry no auth params.
// Since this route runs server-side (and holds the secret), attach the owner
// master bypass automatically to /api/stream/* targets that lack tk/master.
// Playlists rewritten through the proxy stay clean — the secret is re-attached
// on every server-side fetch and never leaks to the client.
function withMasterIfNeeded(target: string): string {
  try {
    const master = process.env.OWNER_MASTER_TOKEN;
    if (!master) return target;
    const u = new URL(target);
    if (!u.pathname.startsWith('/api/stream/')) return target;
    if (u.searchParams.has('tk') || u.searchParams.has('master')) return target;
    u.searchParams.set('master', master);
    return u.toString();
  } catch {
    return target;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }
  if (!isAllowedUpstream(target)) {
    return NextResponse.json({ error: 'Upstream host not allowed' }, { status: 403 });
  }

  const forwardHeaders: Record<string, string> = {
    'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
    Accept: '*/*',
  };
  const range = req.headers.get('range');
  if (range) forwardHeaders.Range = range;

  try {
    const upstreamTarget = withMasterIfNeeded(target);
    const upstreamRes = await fetch(upstreamTarget, {
      headers: forwardHeaders,
      redirect: 'follow',
      cache: 'no-store',
    });

    const contentType = upstreamRes.headers.get('content-type') || '';

    // Playlist (m3u8): rewrite child URIs through the proxy
    if (
      contentType.includes('mpegurl') ||
      contentType.includes('m3u') ||
      target.split('?')[0].endsWith('.m3u8') ||
      target.split('?')[0].endsWith('.m3u')
    ) {
      const body = await upstreamRes.text();
      const rewritten = rewritePlaylist(body, upstreamRes.url || target);
      return new NextResponse(rewritten, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Segments / everything else: stream through untouched
    const headers = new Headers();
    headers.set('Content-Type', contentType || 'application/octet-stream');
    const cl = upstreamRes.headers.get('content-length');
    if (cl) headers.set('Content-Length', cl);
    const cr = upstreamRes.headers.get('content-range');
    if (cr) headers.set('Content-Range', cr);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'no-store');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (error: unknown) {
    console.error('proxy error:', error);
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}
