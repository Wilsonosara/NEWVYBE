"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSent(false);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch {
      setError(
        "Unable to send a reset link right now. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f2f3] px-4 py-10 text-gray-800">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
        <Link href="/login" className="inline-flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-gray-800">
            VYBE
          </span>
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Forgot password?
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Enter the email address on your account and we&apos;ll send you a link
            to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-100"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-700"
            >
              {error}
            </p>
          )}

          {sent && (
            <p
              role="status"
              className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-5 text-gray-700"
            >
              If an account exists for that email, a password reset link has
              been sent. Check your inbox.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending link..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-gray-600">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
