import { useEffect, useState } from 'react';

/**
 * Demo shortcuts (1-Tap login, persona switcher, the shared test password hint) only make sense
 * on a developer's machine or a staging site that opts in with NEXT_PUBLIC_DEMO_LOGIN=true.
 * On the live site they would advertise working accounts, so they stay hidden.
 */
export function isDemoMode(): boolean {
    if (process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true') return true;
    if (typeof window === 'undefined') return false;
    return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

/** isDemoMode() as React state: false on the server and first render, so hydration matches. */
export function useDemoMode(): boolean {
    const [demo, setDemo] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reads window, which only exists after mount
        setDemo(isDemoMode());
    }, []);
    return demo;
}
