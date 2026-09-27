"use client";
import { useState } from 'react';
import { downloadFile } from '@/lib/api';

/**
 * "Export Excel" + "Export PDF" for a report endpoint that serves /{base}/excel and /{base}/pdf.
 * `query` carries the same filters the page is showing (e.g. "target_date=2026-09-27").
 */
export default function ExportButtons({ base, query = '', filename }: { base: string; query?: string; filename: string }) {
    const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null);

    const download = async (fmt: 'excel' | 'pdf') => {
        setBusy(fmt);
        try {
            await downloadFile(`${base}/${fmt}${query ? `?${query}` : ''}`, `${filename}.${fmt === 'excel' ? 'xlsx' : 'pdf'}`);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => download('excel')}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
            >
                {busy === 'excel' ? 'Preparing…' : '⬇ Export Excel'}
            </button>
            <button
                type="button"
                onClick={() => download('pdf')}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
            >
                {busy === 'pdf' ? 'Preparing…' : '⬇ Export PDF'}
            </button>
        </div>
    );
}
