
export const API_URL = process.env.NEXT_PUBLIC_API_URL
    ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
    : (typeof window !== 'undefined'
        ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.hostname}:8000/api/v1`
            : '/api/v1')
        : (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000/api/v1'));


/**
 * Loads data for a page without ever blanking it: on failure it returns undefined and reports
 * why, so the page keeps what it already shows instead of replacing it with an empty list.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function tryFetch<T = any>(endpoint: string, onError?: (message: string) => void): Promise<T | undefined> {
    try {
        return await fetchApi(endpoint);
    } catch (err) {
        onError?.((err instanceof Error && err.message) || 'Could not load the latest data.');
        return undefined;
    }
}

/** Downloads a file from an authenticated endpoint (the token goes in the header, never the URL). */
export async function downloadFile(endpoint: string, filename: string) {
    try {
        const res = await fetchApi(endpoint, {}, true);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        alert((err instanceof Error && err.message) || 'Download failed. Please try again.');
    }
}

/** Revokes the session on the server, then clears it from this browser. */
export async function logout() {
    try {
        await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {
        // Already expired or offline: still clear the local session
    }
    sessionStorage.clear();
    document.cookie = 'token=; Max-Age=0; path=/';
    document.cookie = 'role=; Max-Age=0; path=/';
    window.location.href = '/login';
}

export async function fetchApi(endpoint: string, options: any = {}, rawResponse = false) {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    let cleanEndpoint = endpoint.trim();
    if (!cleanEndpoint.startsWith('/')) cleanEndpoint = '/' + cleanEndpoint;
    if (cleanEndpoint.endsWith('/') && cleanEndpoint.length > 1) {
        cleanEndpoint = cleanEndpoint.slice(0, -1);
    }
    const fetchOptions: RequestInit = {
        cache: 'no-store',
        ...options,
        headers
    };

    let res: Response;
    try {
        res = await fetch(`${API_URL}${cleanEndpoint}`, fetchOptions);
    } catch (networkErr) {
        if (API_URL.startsWith('http')) {
            try {
                res = await fetch(`/api/v1${cleanEndpoint}`, fetchOptions);
            } catch (fallbackErr) {
                throw networkErr;
            }
        } else {
            throw networkErr;
        }
    }
    
    if (res.status === 401) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            document.cookie = 'token=; Max-Age=0; path=/';
            document.cookie = 'role=; Max-Age=0; path=/';
            sessionStorage.clear();
            window.location.href = '/login';
        }
        throw new Error('Session expired. Please sign in again.');
    }

    if (res.status === 403) {
        let msg = 'You do not have permission to access this resource.';
        try {
            const data = await res.json();
            if (data.detail) msg = data.detail;
        } catch(e) {}
        throw new Error(msg);
    }
    
    if (!res.ok) {
        let msg = 'API Error';
        try {
            const data = await res.json();
            msg = data.detail || msg;
        } catch(e) {}
        throw new Error(msg);
    }
    
    return rawResponse ? res : res.json();
}

export function broadcastPortalEvent(event: string, payload: any = {}) {
    if (typeof window !== 'undefined') {
        try {
            if ('BroadcastChannel' in window) {
                const bc = new BroadcastChannel('mr_valet_portal_sync');
                bc.postMessage({ event, payload, timestamp: Date.now() });
                bc.close();
            }
        } catch (e) {}
        try {
            window.dispatchEvent(new CustomEvent('portal_data_updated', { detail: { event, payload } }));
        } catch (e) {}
    }
}
