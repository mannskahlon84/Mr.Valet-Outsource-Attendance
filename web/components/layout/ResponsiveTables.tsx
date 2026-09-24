"use client";
import { useEffect } from 'react';

/**
 * Labels every table cell with its column heading so globals.css can turn tables into
 * stacked cards on phones. Add data-no-cards to a <table> to keep it as a table.
 */
function labelTables(root: ParentNode) {
    root.querySelectorAll<HTMLTableElement>('table:not([data-no-cards])').forEach(table => {
        const headings = Array.from(table.querySelectorAll('thead th')).map(th => (th.textContent || '').trim());
        if (!headings.length) return;
        table.classList.add('rt');
        table.querySelectorAll('tbody tr').forEach(row => {
            let col = 0;
            Array.from(row.children).forEach(cell => {
                const span = (cell as HTMLTableCellElement).colSpan || 1;
                const label = span >= headings.length ? '' : (headings[col] || '');
                if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
                col += span;
            });
        });
    });
}

export default function ResponsiveTables() {
    useEffect(() => {
        labelTables(document);
        let queued = false;
        const observer = new MutationObserver(() => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                labelTables(document);
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);
    return null;
}
