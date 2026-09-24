"use client";

/** Shown when a refresh fails: the page keeps its last data and offers a retry. */
export default function LoadErrorBar({ message, onRetry }: { message: string; onRetry: () => void }) {
    if (!message) return null;
    return (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
                <strong>Couldn&apos;t refresh.</strong> Showing the last loaded data. {message}
            </span>
            <button
                type="button"
                onClick={onRetry}
                className="min-h-[40px] rounded-lg border border-amber-400 bg-white px-4 font-bold text-amber-900 hover:bg-amber-100"
            >
                Retry
            </button>
        </div>
    );
}
