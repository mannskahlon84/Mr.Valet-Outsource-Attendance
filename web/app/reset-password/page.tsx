'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/layout/AuthShell';
import { API_URL } from '../../lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let res: Response;
      try {
        res = await fetch(`${API_URL}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, new_password: password }),
        });
      } catch (e) {
        res = await fetch('/api/v1/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, new_password: password }),
        });
      }
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Failed to reset password');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mb-2 text-lg font-semibold text-emerald-700">Password Reset Successful</div>
        <p className="mb-6 text-sm text-[#1a1a1a]/60">Your password has been updated. All active sessions have been invalidated.</p>
        <Link href="/login" className="inline-flex w-full rounded-xl bg-[#1a1a1a] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#dbb457] hover:text-[#1a1a1a] disabled:opacity-50 cursor-pointer justify-center">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {!token && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No reset token found in URL.</div>}
      
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]/70">New Password</label>
        <input
          type="password"
          required
          className="w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 py-3 text-sm focus:border-[#dbb457] focus:outline-none focus:ring-4 focus:ring-[#dbb457]/20"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]/70">Confirm New Password</label>
        <input
          type="password"
          required
          className="w-full rounded-xl border border-[#1a1a1a]/15 bg-white px-4 py-3 text-sm focus:border-[#dbb457] focus:outline-none focus:ring-4 focus:ring-[#dbb457]/20"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      
      <button
        type="submit"
        disabled={loading || !token}
        className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#dbb457] hover:text-[#1a1a1a] disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
}

export default function ResetPassword() {
  return (
    <AuthShell title="Set New Password" subtitle="At least 8 characters, with letters and numbers">
        <Suspense fallback={<div className="mv-skeleton h-40" />}>
          <ResetPasswordForm />
        </Suspense>
    </AuthShell>
  );
}
