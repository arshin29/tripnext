'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { PublicOnlyRoute } from '../../components/auth/PublicOnlyRoute';
import { useAuth } from '../../context/AuthContext';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({
        email: trimmedEmail,
        password,
      });
      router.push(redirect.startsWith('/') ? redirect : '/dashboard');
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Unable to sign in. Please verify your credentials and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Editorial Card */}
      <div className="bg-surface border border-border rounded-lg p-8 sm:p-10 shadow-card">
        {/* Card Header */}
        <div className="text-center mb-8">
          <span className="text-xs uppercase tracking-widest text-accent font-semibold">
            Member Access
          </span>
          <h1 className="font-semibold text-3xl sm:text-4xl text-primary-text mt-2 tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-secondary-text mt-2.5 font-sans leading-relaxed">
            Sign in to continue planning and exploring your curated travel itineraries.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="eleanor@example.com"
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-md bg-background border border-border text-primary-text text-sm placeholder:text-secondary-text/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-primary-text"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full px-4 py-3 pr-11 rounded-md bg-background border border-border text-primary-text text-sm placeholder:text-secondary-text/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium text-surface bg-accent hover:bg-accent-hover rounded-md transition-all shadow-subtle disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in to TripNext</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-secondary-text">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-accent hover:text-accent-hover hover:underline transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PublicOnlyRoute>
        <div className="min-h-screen flex flex-col bg-background">
          <Navbar />
          <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
            <LoginForm />
          </main>
          <Footer />
        </div>
      </PublicOnlyRoute>
    </Suspense>
  );
}
