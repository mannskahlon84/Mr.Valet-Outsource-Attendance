/**
 * Every date and time in the portals is shown in Qatar time (Asia/Qatar, UTC+3), whatever the
 * viewer's own computer or phone is set to.
 *
 * - Instants (check-in/out, messages, notifications, "generated at") come from the server in UTC,
 *   sometimes without a zone marker; a bare timestamp is therefore read as UTC.
 * - Calendar dates (a shift's required date, a billing month) are days, not instants, and are
 *   shown exactly as stored.
 */
export const QATAR_TZ = 'Asia/Qatar';

type Value = string | number | Date | null | undefined;

/** A server timestamp as a Date; bare "2026-09-27T07:46:02" is treated as UTC. */
export function parseInstant(value: Value): Date | null {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    const text = value.trim();
    const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(text);
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
    const date = new Date(hasZone || isDateOnly ? text : `${text.replace(' ', 'T')}Z`);
    return isNaN(date.getTime()) ? null : date;
}

function format(value: Value, options: Intl.DateTimeFormatOptions, locale = 'en-GB'): string {
    const date = parseInstant(value);
    return date ? date.toLocaleString(locale, { timeZone: QATAR_TZ, ...options }) : '-';
}

/** 07:46 AM (Qatar) */
export function qatarTime(value: Value, withSeconds = false): string {
    return format(value, { hour: '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}), hour12: true }, 'en-US');
}

/** 27 Sep 2026 (Qatar) */
export function qatarDate(value: Value): string {
    return format(value, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** 27 Sep 2026, 07:46 AM (Qatar) */
export function qatarDateTime(value: Value): string {
    const date = parseInstant(value);
    return date ? `${qatarDate(date)}, ${qatarTime(date)}` : '-';
}

/** A calendar day such as a shift's required date: "27 Sep 2026", never shifted by time zones. */
export function calendarDate(value: Value, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
    if (value === null || value === undefined || value === '') return '-';
    const day = typeof value === 'string' ? value.slice(0, 10) : parseInstant(value)?.toISOString().slice(0, 10);
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return '-';
    return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...options });
}

/** "September 2026" for a billing month. */
export function calendarMonth(value: Value): string {
    return calendarDate(value, { month: 'long', year: 'numeric' });
}

/** Today's date in Qatar as YYYY-MM-DD. */
export function qatarToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: QATAR_TZ });
}

/** The current Qatar year, month (1-12), day and hour. */
export function qatarNowParts(): { year: number; month: number; day: number; hour: number } {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', { timeZone: QATAR_TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false })
            .formatToParts(new Date()).map(p => [p.type, p.value])
    );
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour) % 24 };
}
