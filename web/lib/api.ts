
export const API_URL = process.env.NEXT_PUBLIC_API_URL
    ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
    : (typeof window !== 'undefined'
        ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.hostname}:8000/api/v1`
            : '/api/v1')
        : (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000/api/v1'));


export async function fetchApi(endpoint: string, options: any = {}, rawResponse = false) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
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
    let res: Response;
    try {
        res = await fetch(`${API_URL}${cleanEndpoint}`, {
            ...options,
            headers
        });
    } catch (networkErr) {
        if (API_URL.startsWith('http')) {
            try {
                res = await fetch(`/api/v1${cleanEndpoint}`, {
                    ...options,
                    headers
                });
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
            localStorage.clear();
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
