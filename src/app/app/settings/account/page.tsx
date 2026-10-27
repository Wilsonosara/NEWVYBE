
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../utils/supabase/client";

export default function AccountSettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const loadAccount = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");
      setNewEmail(user.email ?? "");
    } catch (err) {
      console.error("Could not load account details:", err);
      setEmailError("We couldn't load your account details. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadAccount(),
      0
    );

    return () => window.clearTimeout(initialLoad);
  }, [loadAccount]);

  const handleEmailUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError("");
    setEmailMessage("");

    const trimmedEmail = newEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError("Please enter an email address.");
      return;
    }

    if (trimmedEmail === email.toLowerCase()) {
      setEmailError("Your new email address is the same as your current one.");
      return;
    }

    setSavingEmail(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({
        email: trimmedEmail,
      });

      if (error) throw error;

      if (data.user?.email) {
        setEmail(data.user.email);
      }

      setEmailMessage(
        "Email change requested. Check your email inbox for any confirmation links required to complete the change."
      );
    } catch (err) {
      console.error("Could not update email:", err);
      setEmailError(
        err instanceof Error
          ? err.message
          : "We couldn't update your email. Please try again."
      );
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordUpdate = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (password.length < 8) {
      setPasswordError("Your new password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Your passwords do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setPassword("");
      setConfirmPassword("");
      setPasswordMessage("Your password has been updated successfully.");
    } catch (err) {
      console.error("Could not update password:", err);
      setPasswordError(
        err instanceof Error
          ? err.message
          : "We couldn't update your password. Please try again."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto min-h-screen w-full max-w-2xl border-x border-gray-100">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur">
          <Link
            href="/app/settings"
            aria-label="Back to settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl transition hover:bg-gray-100"
          >
            ←
          </Link>

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Account settings
            </h1>
            <p className="text-sm text-gray-500">
              Manage your sign-in details
            </p>
          </div>
        </header>

        {loading ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
            <p className="mt-4 text-sm text-gray-500">
              Loading account details...
            </p>
          </div>
        ) : (
          <div className="space-y-8 px-4 py-6">
            <section>
              <h2 className="text-base font-semibold">
                Email address
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Your email is used for signing in and important account updates.
              </p>

              <form
                onSubmit={handleEmailUpdate}
                className="mt-4 rounded-2xl border border-gray-200 p-4"
              >
                <label
                  htmlFor="current-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Current email
                </label>
                <input
                  id="current-email"
                  type="email"
                  value={email}
                  readOnly
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500 outline-none"
                />

                <label
                  htmlFor="new-email"
                  className="mt-4 block text-sm font-medium text-gray-700"
                >
                  New email address
                </label>
                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  autoComplete="email"
                  required
                  placeholder="Enter your new email"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-gray-400"
                />

                {emailError && (
                  <p role="alert" className="mt-3 text-sm text-red-600">
                    {emailError}
                  </p>
                )}

                {emailMessage && (
                  <p role="status" className="mt-3 text-sm text-gray-600">
                    {emailMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingEmail || loading}
                  className="mt-4 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEmail ? "Updating..." : "Update email"}
                </button>
              </form>
            </section>

            <section>
              <h2 className="text-base font-semibold">
                Change password
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Choose a strong password with at least 8 characters.
              </p>

              <form
                onSubmit={handlePasswordUpdate}
                className="mt-4 rounded-2xl border border-gray-200 p-4"
              >
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="Enter a new password"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-gray-400"
                />

                <label
                  htmlFor="confirm-password"
                  className="mt-4 block text-sm font-medium text-gray-700"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="Enter the new password again"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none transition focus:border-gray-400"
                />

                {passwordError && (
                  <p role="alert" className="mt-3 text-sm text-red-600">
                    {passwordError}
                  </p>
                )}

                {passwordMessage && (
                  <p role="status" className="mt-3 text-sm text-gray-600">
                    {passwordMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingPassword || loading}
                  className="mt-4 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl bg-gray-50 p-4">
              <h2 className="text-sm font-semibold">
                Profile information
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Your display name, username, and bio are managed separately
                from your sign-in credentials.
              </p>
              <Link
                href="/app/profile"
                className="mt-3 inline-flex text-sm font-medium text-gray-700 underline underline-offset-4 hover:text-black"
              >
                Edit your profile
              </Link>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
