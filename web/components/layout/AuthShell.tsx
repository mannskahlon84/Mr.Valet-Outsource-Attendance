/** Branded frame for the public account pages (forgot / reset password, unauthorized), matching the login page. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f4ef] px-4 py-10 text-[#1a1a1a]">
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 800">
                <defs>
                    <pattern id="auth-bays" width="90" height="170" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
                        <path d="M0 0V120M90 0V120" stroke="#dbb457" strokeWidth="2" />
                    </pattern>
                </defs>
                <rect width="1200" height="800" fill="url(#auth-bays)" opacity="0.08" />
            </svg>
            <div className="mv-page relative w-full max-w-md rounded-3xl border border-[#1a1a1a]/[0.06] bg-white p-8 shadow-[0_24px_48px_-24px_rgb(26_26_26/0.25)]">
                <img src="/logo.jpg" alt="Mr. Valet Parking Solutions" className="mx-auto h-11 w-auto mix-blend-multiply" />
                <div className="mt-7 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-[#1a1a1a]/55">{subtitle}</p>}
                </div>
                <div className="mt-6">{children}</div>
            </div>
        </div>
    );
}
