import Link from 'next/link';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
                <h1 className="text-3xl font-bold text-red-600 mb-4">Unauthorized</h1>
                <p className="text-gray-600 mb-6">You do not have permission to access this page.</p>
                <Link href="/" className="bg-[#dbb457] text-white px-4 py-2 rounded font-bold hover:bg-[#c29d45]">
                    Return to Home
                </Link>
            </div>
        </div>
    );
}
