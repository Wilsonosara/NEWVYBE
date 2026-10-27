
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.session) {
        router.replace("/app");
        router.refresh();
        return;
      }

      setSuccess(
        "Your registration was received! Check your email for a confirmation link before logging in."
      );
    } catch {
      setError(
        "Something went wrong. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f2f3] px-4 py-10 text-gray-800">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-xl font-bold text-gray-800">
            P
          </span>

          <span className="text-2xl font-bold tracking-tight text-gray-800">
            VYBE
          </span>
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Join the community, connect with people, share ideas, and explore
            your interests.
          </p>
        </div>

        <form onSubmit={handleRegister} className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Full name
            </label>

            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-100"
            />
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-gray-200 bg-[#fafafa] px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your password again"
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

          {success && (
            <div
              role="status"
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700"
            >
              <p className="font-semibold text-gray-900">Check your email</p>

              <p className="mt-1">{success}</p>

              <p className="mt-2">
                If you don&apos;t see the email, check your spam or junk folder.
              </p>

              <Link
                href="/login"
                className="mt-3 inline-block font-semibold text-gray-800 underline underline-offset-4 hover:text-gray-600"
              >
                Go to login
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600"
          >
            Log in
          </Link>
        </p>

        <p className="mt-6 text-center text-xs leading-5 text-gray-400">
          By creating an account, you agree to use VYBE responsibly and
          respectfully.
        </p>
      </div>
    </main>
  );
}
