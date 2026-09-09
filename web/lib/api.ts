
export const API_URL = process.env.NEXT_PUBLIC_API_URL
    ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
    : (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000/api/v1` : 'http://127.0.0.1:8000/api/v1');

export async function fetchApi(endpoint: string, options: any = {}, rawResponse = false) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });
    
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
