import { NextRequest, NextResponse } from 'next/server';

// Same-origin reverse proxy to the FastAPI backend. It never answers on the backend's
// behalf: if the backend is unreachable the caller gets a 503, not made-up data.
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000/api/v1';

// A sleeping free-tier Render backend takes ~45s to wake. Vercel stops the function at
// maxDuration (60s is the Hobby maximum), so give up a little before that with a clear 503.
export const maxDuration = 60;
const TIMEOUT_MS = 55_000;

type Context = { params: Promise<{ slug?: string[] }> };

async function proxy(req: NextRequest, context: Context): Promise<Response> {
    const { slug = [] } = await context.params;
    const path = slug.join('/');
    const needsSlash = ['notifications', 'requests', 'sites', 'suppliers', 'workers', 'allocations'].includes(path);
    const target = `${BACKEND_URL}/${needsSlash ? `${path}/` : path}${req.nextUrl.search}`;

    const headers = new Headers();
    req.headers.forEach((val, key) => {
        if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
            headers.set(key, val);
        }
    });

    const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
        ? await req.arrayBuffer()
        : undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(target, {
            method: req.method,
            headers,
            body,
            cache: 'no-store',
            redirect: 'follow',
            signal: controller.signal,
        });
        const resHeaders = new Headers();
        res.headers.forEach((val, key) => {
            if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
                resHeaders.set(key, val);
            }
        });
        return new Response(await res.arrayBuffer(), {
            status: res.status,
            statusText: res.statusText,
            headers: resHeaders,
        });
    } catch {
        return NextResponse.json(
            { detail: 'The server could not be reached. Nothing was saved. Please check your connection and try again in a minute.' },
            { status: 503 }
        );
    } finally {
        clearTimeout(timeout);
    }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
