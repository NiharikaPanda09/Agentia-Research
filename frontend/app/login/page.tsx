// frontend/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../lib/api';
import { Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.login(email, password);
      router.push('/dashboard');
      // Trigger a page refresh to update auth state in window context
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] text-zinc-100 overflow-hidden font-sans">
      {/* Background ambient glowing blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphic Container */}
      <div className="relative w-full max-w-md p-8 mx-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-purple-600/15 text-purple-400 rounded-xl mb-4 border border-purple-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-zinc-400 text-sm text-center">
            Sign in to access your multi-agent research workspace.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-xl text-sm leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email"
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-zinc-950/50 border border-zinc-800 focus:border-purple-500/60 rounded-xl text-zinc-200 text-sm placeholder-zinc-600 outline-none transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-zinc-950/50 border border-zinc-800 focus:border-purple-500/60 rounded-xl text-zinc-200 text-sm placeholder-zinc-600 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm cursor-pointer shadow-lg shadow-purple-600/10 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-500">
          New here?{' '}
          <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
