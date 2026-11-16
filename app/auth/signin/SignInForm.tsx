'use client';

import { KeyRound, Lock, Mail } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const callbackUrl = useSearchParams().get('callbackUrl') || '/';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid password, or that email is not a school address.');
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-columbia-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-columbia-600" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-center text-slate-800 mb-2">
          Welcome to Startup Hub
        </h1>
        <p className="text-slate-500 text-center mb-6">
          Sign in with your school email
        </p>

        {googleEnabled && (
          <>
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl })}
              className="w-full py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
            >
              Continue with Columbia (Google) account
            </button>
            <div className="flex items-center gap-3 my-5 text-xs text-slate-400">
              <div className="flex-1 h-px bg-slate-200" /> or class password <div className="flex-1 h-px bg-slate-200" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                School email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-columbia-500 focus:border-transparent pl-11"
                  placeholder="uni@gsb.columbia.edu"
                  required
                  autoFocus
                  disabled={isLoading}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-columbia-500 focus:border-transparent pl-11"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-columbia-600 text-white rounded-lg hover:bg-columbia-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          Sessions last 30 days - you&apos;ll stay logged in
        </p>
      </div>
    </div>
  );
}