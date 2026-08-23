import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebaseAdmin';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ category: string; id: string }> }
) {
  try {
    const { category, id } = await params;
    const db = getAdminDB();
    const snapshot = await db.ref(`/${category}/${id}`).once('value');

    if (!snapshot.exists()) {
      return new Response('Stream Not Found', { status: 404 });
    }

    const link = snapshot.val();
    if (!link?.original) {
      return new Response('Stream Not Found', { status: 404 });
    }

    let targetUrl = link.original;
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
