/** Grey shimmering placeholders shown while a page's data loads. */
export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`mv-skeleton ${className}`} aria-hidden="true" />;
}

/** A generic dashboard placeholder: header, figure cards and a table. */
export function DashboardSkeleton({ cards = 4, rows = 5 }: { cards?: number; rows?: number }) {
    return (
        <div className="space-y-6" role="status" aria-label="Loading">
            <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-8 w-72" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: cards }, (_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
            <div className="space-y-2 rounded-2xl bg-white p-5">
                {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
        </div>
    );
}
