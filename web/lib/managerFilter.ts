/**
 * Utility to strictly filter venues, requests, and site shift data
 * according to the assigned locations of each Operations Manager.
 */

export interface ManagerInfo {
    name: string;
    email: string;
    sitesCount: number;
    highlight: string;
    matchKeys: string[];
}

export const ALL_OPS_MANAGERS: ManagerInfo[] = [
    { 
        name: "Maen Klaib", 
        email: "maen.klaib@mrvalet.com", 
        sitesCount: 30, 
        highlight: "Fairmont, City Center, Lusail, Mall of Qatar, Villaggio",
        matchKeys: ["maen", "klaib", "103", "6"]
    },
    { 
        name: "Wissem Chagtmi", 
        email: "wissem.chagtmi@mrvalet.com", 
        sitesCount: 25, 
        highlight: "Banana Island, Katara Village, The Ned, Msheireb, Banyan Tree",
        matchKeys: ["wissem", "chagtmi", "101", "8"]
    },
    { 
        name: "Hani Abdelsallam", 
        email: "hani.abdelsallam@mrvalet.com", 
        sitesCount: 19, 
        highlight: "121 Tower, The Pearl, Katara Hills, Lagoona, Ritz Carlton",
        matchKeys: ["hani", "abdelsallam", "102", "5"]
    },
    { 
        name: "Brahim Hayouni", 
        email: "brahim.hayouni@mrvalet.com", 
        sitesCount: 5, 
        highlight: "Al Maha Island, Centro Mall, Old Doha Port, Tower 18, Surgi Art",
        matchKeys: ["brahim", "hayouni", "104", "7"]
    },
    { 
        name: "Ghazi Alshammari", 
        email: "ghazi.alshammari@mrvalet.com", 
        sitesCount: 3, 
        highlight: "M Gallery Hotel, Msheireb Downtown, Park Hyatt Doha",
        matchKeys: ["ghazi", "alshammari", "105", "16"]
    }
];

export function getActiveManagerKeys(): string[] | null {
    if (typeof window === 'undefined') return null;
    const role = (localStorage.getItem('role') || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'GENERAL_MANAGER' || role === 'ACCOUNTING') {
        return null; // Admin sees all
    }

    const name = (localStorage.getItem('name') || '').toLowerCase();
    const email = (localStorage.getItem('email') || '').toLowerCase();
    const text = `${name} ${email}`;

    for (const mgr of ALL_OPS_MANAGERS) {
        if (mgr.matchKeys.some(k => text.includes(k.toLowerCase()))) {
            return mgr.matchKeys;
        }
    }
    return null;
}

export function filterSitesForManager(sites: any[]): any[] {
    if (!Array.isArray(sites)) return [];
    const keys = getActiveManagerKeys();
    if (!keys) return sites; // No filter for admins / non-ops

    return sites.filter(s => {
        const mgrName = (s.manager_name || s.manager || '').toLowerCase();
        const mgrId = String(s.manager_id || s.mgrId || '');
        return keys.some(k => mgrName.includes(k) || mgrId === k);
    });
}

export function filterRequestsForManager(requests: any[]): any[] {
    if (!Array.isArray(requests)) return [];
    const keys = getActiveManagerKeys();
    if (!keys) return requests;

    return requests.filter(r => {
        const omName = (r.ops_manager_name || '').toLowerCase();
        const omId = String(r.ops_manager_id || '');
        const siteMgr = (r.site_manager_name || '').toLowerCase();
        return keys.some(k => omName.includes(k) || omId === k || siteMgr.includes(k));
    });
}

export function filterLocationShiftsForManager(locationShifts: any[]): any[] {
    if (!Array.isArray(locationShifts)) return [];
    const keys = getActiveManagerKeys();
    if (!keys) return locationShifts;

    return locationShifts.filter(loc => {
        const mgrName = (loc.manager_name || loc.manager || '').toLowerCase();
        const mgrId = String(loc.manager_id || '');
        if (mgrName || mgrId) {
            return keys.some(k => mgrName.includes(k) || mgrId === k);
        }
        return true;
    });
}
