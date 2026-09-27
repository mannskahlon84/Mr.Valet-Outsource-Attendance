'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/layout/AuthShell';
import { API_URL } from '../../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let res: Response;
      try {
        res = await fetch(`${API_URL}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch (e) {
        res = await fetch('/api/v1/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      }
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'An error occurred');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Forgot Password" subtitle="We'll email you a link to choose a new password">
        {success ? (
          <div className="space-y-5 text-center">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">If an account exists for this email, you will receive a password reset link.</p>
            <Link href="/login" className="text-sm font-semibold text-[#a8842f] hover:text-[#1a1a1a] hover:underline">Return to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
            
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]/70">Email Address</label>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 py-3 text-sm focus:border-[#dbb457] focus:outline-none focus:ring-4 focus:ring-[#dbb457]/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#dbb457] hover:text-[#1a1a1a] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="text-center">
              <Link href="/login" className="text-sm font-semibold text-[#a8842f] hover:text-[#1a1a1a] hover:underline">Back to Login</Link>
            </div>
          </form>
        )}
    </AuthShell>
  );
}
