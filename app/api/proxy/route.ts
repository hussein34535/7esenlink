import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });

        const headers = new Headers();
        response.headers.forEach((value, key) => {
            // Forward relevant headers
            if (['content-type', 'content-length', 'access-control-allow-origin'].includes(key.toLowerCase())) {
                headers.set(key, value);
            }
        });
        // Ensure we allow CORS for our own frontend
        headers.set('Access-Control-Allow-Origin', '*');

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers,
        });
    } catch (error) {
        console.error("Proxy Error:", error);
        return new NextResponse(`Proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
    }
}
