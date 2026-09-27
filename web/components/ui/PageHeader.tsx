/** Page title block: small gold eyebrow, title, subtitle, and actions on the right. */
export default function PageHeader({ eyebrow, title, subtitle, actions }: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {eyebrow && (
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#a8842f]">
                        <span className="h-px w-6 bg-[#dbb457]" />
                        {eyebrow}
                    </div>
                )}
                <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-[1.75rem]">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-[#1a1a1a]/55">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
