"use client";
import { X } from 'lucide-react';
import Portal from './Portal';

/** Centered dialog with a title bar. `onClose` is what the page's own Cancel button already does. */
export default function Modal({ title, subtitle, onClose, children, width = 'max-w-md' }: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    width?: string;
}) {
    return (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="mv-fade-in absolute inset-0 bg-[#1a1a1a]/50 backdrop-blur-sm" />
            <div role="dialog" aria-modal="true" aria-label={title}
                className={`mv-pop relative flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}>
                <div className="flex items-start justify-between gap-4 border-b border-[#1a1a1a]/[0.06] px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-[#1a1a1a]">{title}</h2>
                        {subtitle && <p className="text-xs text-[#1a1a1a]/50">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[#1a1a1a]/40 hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto px-6 py-5">{children}</div>
            </div>
        </div>
        </Portal>
    );
}
