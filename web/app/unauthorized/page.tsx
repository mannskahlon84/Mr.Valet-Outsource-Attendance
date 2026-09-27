import Link from 'next/link';
import AuthShell from '@/components/layout/AuthShell';

export default function UnauthorizedPage() {
    return (
        <AuthShell title="Unauthorized" subtitle="You do not have permission to access this page.">
            <Link href="/" className="flex w-full rounded-xl bg-[#1a1a1a] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#dbb457] hover:text-[#1a1a1a] disabled:opacity-50 cursor-pointer justify-center">
                Return to Home
            </Link>
        </AuthShell>
    );
}
