"use client";
import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Counts up from the previous value to the new one, so live figures visibly change. */
function useCountUp(target: number, durationMs = 700): number {
    const [shown, setShown] = useState(target);
    const from = useRef(0);
    useEffect(() => {
        const start = performance.now();
        const origin = from.current;
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            setShown(Math.round(origin + (target - origin) * eased));
            if (t < 1) frame = requestAnimationFrame(step);
            else from.current = target;
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [target, durationMs]);
    return shown;
}

type Accent = 'ink' | 'gold' | 'green' | 'red' | 'blue';

const ACCENTS: Record<Accent, { icon: string; value: string }> = {
    ink: { icon: 'bg-[#1a1a1a] text-[#dbb457]', value: 'text-[#1a1a1a]' },
    gold: { icon: 'bg-[#dbb457]/15 text-[#a8842f]', value: 'text-[#1a1a1a]' },
    green: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
    red: { icon: 'bg-rose-50 text-rose-600', value: 'text-rose-700' },
    blue: { icon: 'bg-sky-50 text-sky-600', value: 'text-sky-700' },
};

/** A headline figure with an icon; numbers animate when they change. */
export default function StatCard({ label, value, hint, icon: Icon, accent = 'gold', prefix = '', suffix = '' }: {
    label: string;
    value: number;
    hint?: string;
    icon?: LucideIcon;
    accent?: Accent;
    prefix?: string;
    suffix?: string;
}) {
    const shown = useCountUp(value);
    const colors = ACCENTS[accent];
    return (
        <div className="mv-lift rounded-2xl border border-[#1a1a1a]/[0.06] bg-white p-5 shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
            <div className="flex items-start justify-between gap-3">
                <div className="text-xs font-semibold text-[#1a1a1a]/55">{label}</div>
                {Icon && (
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}>
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </span>
                )}
            </div>
            <div className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${colors.value}`}>
                {prefix}{shown.toLocaleString()}{suffix}
            </div>
            {hint && <div className="mt-1 text-xs text-[#1a1a1a]/45">{hint}</div>}
        </div>
    );
}
