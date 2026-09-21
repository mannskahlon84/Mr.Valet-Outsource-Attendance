function normalizeRole(role) {
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

const roles = [
    "Super Admin",
    "General Manager",
    "Management",
    "Operations Manager",
    "HR/Admin",
    "Supplier Head",
    "Outsource Worker",
    "Accounting"
];

console.log("Testing frontend routing logic based on backend roles:");
for (const r of roles) {
    const norm = normalizeRole(r);
    let route = '/admin'; // default fallback
    if (norm === 'SUPER_ADMIN') route = '/admin';
    else if (norm === 'OPS_MANAGER') route = '/operations';
    else if (norm === 'ACCOUNTING') route = '/accounting';
    else if (norm === 'GENERAL_MANAGER') route = '/gm';
    else if (norm === 'SUPPLIER_HEAD') route = '/supplier';
    else if (norm === 'OUTSOURCE_WORKER') route = '/worker';
    
    console.log(`Backend Role: "${r}" => Normalized: "${norm}" => Route: "${route}"`);
}
