'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { PublicOnlyRoute } from '../../components/auth/PublicOnlyRoute';
import { useAuth } from '../../context/AuthContext';

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Full name must be at least 2 characters.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasUpper || !hasLower || !hasNumber) {
      setErrorMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Registration could not be completed. Please try again.',
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
            Join TripNext
          </span>
          <h1 className="font-semibold text-3xl sm:text-4xl text-primary-text mt-2 tracking-tight">
            Begin your journey
          </h1>
          <p className="text-sm text-secondary-text mt-2.5 font-sans leading-relaxed">
            Create an account to thoughtfully plan, organize, and curate unforgettable
            travels.
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2"
            >
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Julian Vance"
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-md bg-background border border-border text-primary-text text-sm placeholder:text-secondary-text/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50"
            />
          </div>

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
              placeholder="julian@example.com"
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-md bg-background border border-border text-primary-text text-sm placeholder:text-secondary-text/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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
            <p className="text-xs text-secondary-text mt-1.5">
              Must include at least 8 characters, with uppercase, lowercase, and a number.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                disabled={isLoading}
                className="w-full px-4 py-3 pr-11 rounded-md bg-background border border-border text-primary-text text-sm placeholder:text-secondary-text/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
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
            className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium text-surface bg-accent hover:bg-accent-hover rounded-md transition-all shadow-subtle disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating your account...</span>
              </>
            ) : (
              <>
                <span>Create TripNext Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-secondary-text">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-accent hover:text-accent-hover hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
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
            <RegisterForm />
          </main>
          <Footer />
        </div>
      </PublicOnlyRoute>
    </Suspense>
  );
}
