import type { LucideIcon } from 'lucide-react';

/** White rounded section with an optional icon, title, subtitle and header action. */
export default function Panel({ icon: Icon, title, subtitle, action, className = '', bodyClassName = 'p-5 sm:p-6', children }: {
    icon?: LucideIcon;
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    children: React.ReactNode;
}) {
    return (
        <section className={`overflow-hidden rounded-2xl border border-[#1a1a1a]/[0.06] bg-white shadow-[0_1px_2px_rgb(26_26_26/0.04)] ${className}`}>
            {title && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1a1a1a]/[0.06] px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dbb457]/15 text-[#a8842f]">
                                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                            </span>
                        )}
                        <div>
                            <h2 className="text-base font-bold text-[#1a1a1a]">{title}</h2>
                            {subtitle && <p className="text-xs text-[#1a1a1a]/45">{subtitle}</p>}
                        </div>
                    </div>
                    {action}
                </div>
            )}
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}
