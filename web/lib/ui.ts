/** Shared Tailwind class sets so every portal page looks the same. Visual only. */
export const ui = {
    btnPrimary: 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#dbb457] hover:text-[#1a1a1a] hover:shadow-md disabled:opacity-50 disabled:hover:bg-[#1a1a1a] disabled:hover:text-white cursor-pointer',
    btnGold: 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#dbb457] px-4 py-2.5 text-sm font-semibold text-[#1a1a1a] shadow-sm transition-all hover:bg-[#c9a043] hover:shadow-md disabled:opacity-50 cursor-pointer',
    btnSecondary: 'inline-flex items-center justify-center gap-2 rounded-xl border border-[#1a1a1a]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a1a]/75 transition-colors hover:border-[#1a1a1a]/20 hover:bg-[#f6f4ef] hover:text-[#1a1a1a] disabled:opacity-50 cursor-pointer',
    btnDanger: 'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-50 cursor-pointer',
    /** Small inline row actions */
    action: 'inline-flex items-center gap-1.5 rounded-lg border border-[#1a1a1a]/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1a1a1a]/75 transition-all hover:border-[#dbb457] hover:bg-[#dbb457]/10 hover:text-[#1a1a1a] disabled:opacity-50 cursor-pointer',
    actionDanger: 'inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50 cursor-pointer',
    actionGood: 'inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50 cursor-pointer',
    label: 'mb-1.5 block text-xs font-semibold text-[#1a1a1a]/65',
    input: 'w-full rounded-xl border border-[#1a1a1a]/12 bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#1a1a1a]/35 transition-shadow focus:border-[#dbb457] focus:outline-none focus:ring-4 focus:ring-[#dbb457]/20 disabled:bg-[#f6f4ef] disabled:text-[#1a1a1a]/50',
    card: 'rounded-2xl border border-[#1a1a1a]/[0.06] bg-white shadow-[0_1px_2px_rgb(26_26_26/0.04)]',
    th: 'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#1a1a1a]/40',
    td: 'px-5 py-4 text-sm text-[#1a1a1a]/80',
    tr: 'transition-colors hover:bg-[#f6f4ef]/70',
    chip: 'inline-flex items-center gap-1 rounded-full bg-[#1a1a1a]/[0.05] px-2.5 py-1 text-xs font-semibold text-[#1a1a1a]/70',
};

export function initials(name?: string | null): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '—';
}
