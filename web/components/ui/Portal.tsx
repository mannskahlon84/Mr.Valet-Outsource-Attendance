"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Renders children at the end of <body>, so fixed overlays are positioned against the screen. */
export default function Portal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- document.body exists only after mount
    useEffect(() => setMounted(true), []);
    return mounted ? createPortal(children, document.body) : null;
}
