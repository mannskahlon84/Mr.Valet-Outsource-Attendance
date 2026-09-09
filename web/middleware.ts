import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function normalizeRole(role?: string): string {
    if (!role) return '';
    const clean = decodeURIComponent(role).trim().toLowerCase().replace(/[_\s-]+/g, '');
    if (clean.includes('superadmin')) return 'SUPER_ADMIN';
    if (clean.includes('operations') || clean.includes('opsmanager')) return 'OPS_MANAGER';
    if (clean.includes('accounting')) return 'ACCOUNTING';
    if (clean.includes('generalmanager') || clean === 'gm') return 'GENERAL_MANAGER';
    if (clean.includes('supplier')) return 'SUPPLIER_HEAD';
    if (clean.includes('worker') || clean.includes('employee')) return 'OUTSOURCE_WORKER';
    return clean.toUpperCase();
}

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const rawRole = request.cookies.get('role')?.value;
    const path = request.nextUrl.pathname;
    const role = normalizeRole(rawRole);

    const isPublic = path === '/login' || path === '/forgot-password' || path === '/reset-password';

    if (!token && !isPublic) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token && isPublic) {
        if (role === 'SUPER_ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
        if (role === 'OPS_MANAGER') return NextResponse.redirect(new URL('/operations', request.url));
        if (role === 'ACCOUNTING') return NextResponse.redirect(new URL('/accounting', request.url));
        if (role === 'GENERAL_MANAGER') return NextResponse.redirect(new URL('/gm', request.url));
        if (role === 'SUPPLIER_HEAD') return NextResponse.redirect(new URL('/supplier', request.url));
        if (role === 'OUTSOURCE_WORKER') return NextResponse.redirect(new URL('/worker', request.url));
        return NextResponse.redirect(new URL('/admin', request.url));
    }

    if (role && role !== 'SUPER_ADMIN') {
        if (path.startsWith('/admin')) return NextResponse.redirect(new URL('/unauthorized', request.url));
        if (path.startsWith('/operations') && role !== 'OPS_MANAGER') return NextResponse.redirect(new URL('/unauthorized', request.url));
        if (path.startsWith('/accounting') && role !== 'ACCOUNTING') return NextResponse.redirect(new URL('/unauthorized', request.url));
        if (path.startsWith('/gm') && role !== 'GENERAL_MANAGER') return NextResponse.redirect(new URL('/unauthorized', request.url));
        if (path.startsWith('/supplier') && role !== 'SUPPLIER_HEAD') return NextResponse.redirect(new URL('/unauthorized', request.url));
        if (path.startsWith('/worker') && role !== 'OUTSOURCE_WORKER') return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.*|file.svg|globe.svg|window.svg).*)'],
};
