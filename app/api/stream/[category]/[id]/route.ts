import { NextResponse } from 'next/server';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getAdminDB } from '@/lib/firebaseAdmin';

const DAY_MS = 86400000;

// Stream URL validator + proxy.
//
// - If STREAM_TOKEN_SECRET is NOT set → open links, exactly the legacy
//   behavior (zero regression before the app update ships).
// - If it IS set → require ?tk=<token>&sid=<sessionId>: the token is an HMAC
//   minted by the 7esen backend (`<uid-b64>.<deviceId-b64>.<day>.<hmac>`),
//   and the session is validated live against 7esen's internal session-check
//   endpoint (single-session + heartbeat enforcement lives there).
// - GENRAL channels are stored as a marker (original=genral://<id> plus a
//   `genral` field {host, id, key, ip}) — their real URL is a to4-style token
//   built at request time (SHA1, time-based), so it is resolved here per
//   request and then flows through the same redirect-following logic.

function b64urlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

// Dashboard/admin URLs use short category names (e.g. "BEIN SPORT", "ALWAN",
// "STC TV") while Firebase keys use full names ("beIN SPORTS", "ALWAN SPORTS",
// "STC SPORTS"). Resolve the real node by trying aliases + case/plural variants.
const CATEGORY_ALIASES: Record<string, string> = {
  'bein sport': 'beIN SPORTS',
  'bein sports': 'beIN SPORTS',
  'alwan': 'ALWAN SPORTS',
  'alwan sports': 'ALWAN SPORTS',
  'stc tv': 'STC SPORTS',
  'stc': 'STC SPORTS',
  'stc sports': 'STC SPORTS',
  'dazn': 'DAZN SPORTS',
  'dazn sports': 'DAZN SPORTS',
  'shahid': 'SHAHID SPORTS',
  'shahid sports': 'SHAHID SPORTS',
  'starzplay': 'STARZPLAY SPORTS',
  'starzplay sports': 'STARZPLAY SPORTS',
  'sky': 'SKY SPORTS',
  'sky sports': 'SKY SPORTS',
  'on sports': 'ON SPORTS',
  'on sport': 'ON SPORTS',
  'arab sports': 'ARAB SPORTS',
  'arab sport': 'ARAB SPORTS',
  'ad sport': 'AD SPORTS',
  'ad sports': 'AD SPORTS',
  'alkass': 'ALKASS SPORTS',
  'alkass sports': 'ALKASS SPORTS',
  'alkass hd': 'ALKASS SPORTS',
  'max sports': 'MAX SPORTS',
  'max sport': 'MAX SPORTS',
  'kurdish sports': 'KURDISH SPORTS',
  'kurdish sport': 'KURDISH SPORTS',
  'egyptian clubs': 'EGYPTIAN CLUBS',
  'egypt': 'EGYPTIAN CLUBS',
  'thamanya sports': 'THAMANYA SPORTS',
  'thamanya sport': 'THAMANYA SPORTS',
  'tnt sports': 'TNT SPORTS',
  'tnt sport': 'TNT SPORTS',
  'vip sports': 'VIP SPORTS',
  'vip sport': 'VIP SPORTS',
  'wwe': 'WWE',
  'sport tv': 'SPORT TV',
};

async function resolveStreamNode(db: FirebaseFirestoreLike, category: string, id: string): Promise<{ key: string; val: unknown } | null> {
  const norm = category.trim();
  const candidates: string[] = [norm];
  const alias = CATEGORY_ALIASES[norm.toLowerCase()];
  if (alias) candidates.unshift(alias);
  candidates.push(
    norm.toUpperCase(),
    norm.toLowerCase(),
    `${norm} SPORTS`,
    `${norm.toUpperCase()} SPORTS`,
  );
  const seen = new Set<string>();
  for (const cand of candidates.slice(0, 8)) {
    if (!cand || seen.has(cand)) continue;
    seen.add(cand);
    try {
      const snap = await db.ref(`/${cand}/${id}`).once('value');
      if (snap.exists()) return { key: cand, val: snap.val() };
    } catch {
      // try next candidate
    }
  }
  return null;
}

// Minimal structural type for the Firebase Admin DB handle used here.
type FirebaseFirestoreLike = {
  ref: (path: string) => { once: (event: string) => Promise<{ exists: () => boolean; val: () => unknown }> };
};

function buildGenralUrl(g: { host?: string; id?: string; hid?: string; key?: string; hkey?: string; ip?: string }): string | null {
  const host = g.host ? String(g.host).replace(/\/+$/, '') : null;
  const hid = g.id ? String(g.id) : g.hid ? String(g.hid) : null;
  const key = g.key ? String(g.key) : g.hkey ? String(g.hkey) : null;
  const ip = g.ip ? String(g.ip) : null;
  if (!host || !hid || !key || !ip) return null;

  const now = Math.floor(Date.now() / 1000);
  const ct = now - 2038;
  const j = ct + 10800;
  const h = randomBytes(8).toString('hex'); // 16 random hex chars
  const sha1 = createHash('sha1').update(`${hid}${ip}${ct}${j}${key}${h}`).digest('hex');
  return `${host}/${hid}/index.m3u8?token=${sha1}&remote=${ip}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ category: string; id: string }> }
) {
  try {
    const { category, id } = await params;
    const tokenSecret = process.env.STREAM_TOKEN_SECRET;
    const internalSecret = process.env.INTERNAL_SESSION_SECRET;
    const internalBase = process.env.INTERNAL_CHECK_BASE;

    // --- Token gate (only active when STREAM_TOKEN_SECRET is configured) ---
    if (tokenSecret) {
      if (!internalSecret || !internalBase) {
        return new Response('TOKEN-SYSTEM-MISCONFIGURED', { status: 500 });
      }

      const searchParams = new URL(req.url).searchParams;
      const tk = searchParams.get('tk');
      const sid = searchParams.get('sid');
      const master = searchParams.get('master');

      // Owner master bypass: a single secret that skips the whole ticket flow.
      const ownerToken = process.env.OWNER_MASTER_TOKEN;
      let ownerBypass = false;
      if (ownerToken && master) {
        const a = Buffer.from(ownerToken);
        const b = Buffer.from(master);
        ownerBypass = a.length === b.length && timingSafeEqual(a, b);
      }
      if (!ownerBypass && (!tk || !sid)) {
        return new Response('TOKEN-MISSING', { status: 403 });
      }

      if (!ownerBypass) {
        const parts = tk!.split('.');
        if (parts.length !== 4) {
          return new Response('TOKEN-MALFORMED', { status: 403 });
        }
        const [uidB64, devB64, dayStr, sigHex] = parts;
        const day = parseInt(dayStr, 10);
        if (!Number.isFinite(day)) {
          return new Response('TOKEN-MALFORMED', { status: 403 });
        }

        const uid = b64urlDecode(uidB64);
        const deviceId = b64urlDecode(devB64);
        const expected = createHmac('sha256', tokenSecret)
          .update(`${uid}.${deviceId}.${dayStr}`)
          .digest('hex');
        const a = Buffer.from(sigHex, 'hex');
        const b = Buffer.from(expected, 'hex');
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response('TOKEN-BAD-SIGNATURE', { status: 403 });
        }

        if (day !== Math.floor(Date.now() / DAY_MS)) {
          return new Response('TOKEN-EXPIRED', { status: 403 });
        }

        try {
          const dv = searchParams.get('dv');
          let checkUrl = `${internalBase.replace(/\/+$/, '')}/api/internal/session-check?tk=${encodeURIComponent(tk!)}&sid=${encodeURIComponent(sid!)}`;
          if (dv) {
            checkUrl += `&dv=${encodeURIComponent(dv)}`;
          }
          const res = await fetch(checkUrl, {
            headers: { 'x-internal-secret': internalSecret },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
          });
          let active = false;
          let reason = 'SESSION-INVALID';
          try {
            const data = await res.json();
            if (data?.active === true) {
              active = true;
            } else if (typeof data?.reason === 'string' && data.reason) {
              reason = data.reason.replace(/_/g, '-');
            }
          } catch {
            // Non-JSON response -> keep default reason.
          }
          if (!active) {
            return new Response(`TOKEN-${reason}`, { status: 403 });
          }
        } catch {
          return new Response('TOKEN-SESSION-INVALID', { status: 403 });
        }
      }
    }

    const db = getAdminDB();
    const resolved = await resolveStreamNode(db as unknown as FirebaseFirestoreLike, category, id);

    if (!resolved) {
      return new Response('Stream Not Found', { status: 404 });
    }

    const link = resolved.val as { original?: string; genral?: unknown } | null;
    if (!link?.original) {
      return new Response('Stream Not Found', { status: 404 });
    }

    // Resolve the GENRAL marker into a real to4-style URL built at request time.
    let targetUrl = link.original;
    if (
      (typeof link.original === 'string' && link.original.startsWith('genral://')) ||
      link.genral
    ) {
      const resolved = buildGenralUrl(link.genral || {});
      if (resolved) targetUrl = resolved;
    }

    let redirectCount = 0;

    // Follow redirects on the server (up to 5 hops) to get the final stream URL.
    // This prevents headers (like User-Agent) from being stripped during client/proxy redirects.
    while (redirectCount < 5) {
      try {
        const response = await fetch(targetUrl, {
          method: 'GET', // Use GET as HEAD is blocked by some IPTV servers (405)
          headers: {
            'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          },
          redirect: 'manual',
        });

        if (
          response.status === 301 ||
          response.status === 302 ||
          response.status === 307 ||
          response.status === 308
        ) {
          const location = response.headers.get('location');
          if (location) {
            targetUrl = new URL(location, targetUrl).toString();
            redirectCount++;
            continue;
          }
        }
        break;
      } catch (err) {
        console.error('Error resolving redirect:', err);
        break;
      }
    }

    return NextResponse.redirect(targetUrl, { status: 307 });
  } catch (error: any) {
    return new Response('Internal Server Error', { status: 500 });
  }
}
