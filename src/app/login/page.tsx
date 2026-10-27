
"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        setError(
          loginError.message === "Email not confirmed"
            ? "Please confirm your email address using the link we sent you before logging in."
            : loginError.message
        );
        return;
      }

      router.replace("/app");
      router.refresh();
    } catch {
      setError(
        "Unable to log in right now. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f2f3] px-4 py-10 text-gray-800">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-xl font-bold text-gray-800">
              P
            </span>

            <span className="text-2xl font-bold tracking-tight text-gray-800">
              VYBE
            </span>
          </Link>

          <Link
            href="/register"
            className="text-sm font-semibold text-gray-700 underline underline-offset-4 hover:text-gray-500"
          >
            Create an account
          </Link>
        </div>

        <div className="mt-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Log in
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Sign in to reconnect with your community and continue where you left
            off.
          </p>
        </div>

        {searchParams.get("message") === "confirmation_failed" && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-5 text-gray-700"
          >
            We couldn&apos;t complete your email confirmation. Please try the link
            again or contact support if the problem continues.
          </p>
        )}

        <form onSubmit={handleLogin} className="mt-7 space-y-5">
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

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="mt-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">Welcome back</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <p className="mt-7 text-center text-sm text-gray-600">
          New to VYBE?{" "}
          <Link
            href="/register"
            className="font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
