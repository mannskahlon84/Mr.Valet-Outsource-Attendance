import {
    Activity, Award, Banknote, Bell, Building2, ClipboardList, Clock, FilePlus2, FileText, Gauge, LayoutDashboard,
    type LucideIcon, Map, MapPin, Receipt, Send, ShieldCheck, TrendingUp, UserCog, Users, Wallet,
} from 'lucide-react';

// One line icon per menu link, looked up by its address so the portal layouts stay unchanged
const ICONS: Record<string, LucideIcon> = {
    '/operations': LayoutDashboard,
    '/operations/requests': ClipboardList,
    '/operations/requests/new': Send,
    '/operations/attendance': Clock,
    '/operations/sites': MapPin,

    '/supplier': LayoutDashboard,
    '/supplier/requests': ClipboardList,
    '/supplier/attendance': Activity,
    '/supplier/workers': Users,
    '/supplier/invoices': Receipt,
    '/supplier/notifications': Bell,

    '/accounting': Wallet,
    '/accounting/invoices': FileText,
    '/accounting/custom': FilePlus2,
    '/accounting/audit': ShieldCheck,

    '/admin': LayoutDashboard,
    '/admin/users': UserCog,
    '/admin/suppliers': Building2,
    '/admin/workers': Users,
    '/admin/locations': MapPin,
    '/admin/requests': ClipboardList,
    '/admin/attendance': Clock,
    '/admin/accounting': Banknote,

    '/gm': Gauge,
    '/gm/financials': TrendingUp,
    '/gm/operations': Map,
    '/gm/suppliers': Award,
    '/gm/workers': Users,
};

export function navIcon(href: string): LucideIcon {
    return ICONS[href] || LayoutDashboard;
}
