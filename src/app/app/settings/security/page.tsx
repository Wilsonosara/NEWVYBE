
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../utils/supabase/client";

export default function SecuritySettingsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAccount = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    setEmail(user.email ?? "");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadAccount(),
      0
    );

    return () => window.clearTimeout(initialLoad);
  }, [loadAccount]);

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters long.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Your new password must be different from your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Your new passwords do not match.");
      return;
    }

    if (!email) {
      setError(
        "Your account has no email address available for password verification."
      );
      return;
    }

    setSavingPassword(true);

    try {
      const supabase = createClient();

      // Verify the current password before allowing a password change.
      const { error: verificationError } =
        await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

      if (verificationError) {
        setError("Your current password is incorrect. Please try again.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Your password has been changed successfully.");
    } catch (err) {
      console.error("Password update failed:", err);
      setError("Something went wrong while changing your password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOutOtherDevices() {
    const confirmed = window.confirm(
      "Sign out of other devices? Your current device will remain signed in."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setSigningOutOthers(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { error: signOutError } = await supabase.auth.signOut({
        scope: "others",
      });

      if (signOutError) {
        setError(signOutError.message);
        return;
      }

      setMessage("Other active sessions have been signed out.");
    } catch (err) {
      console.error("Could not sign out other devices:", err);
      setError("Could not sign out other devices. Please try again.");
    } finally {
      setSigningOutOthers(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-gray-500">Loading security settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 pb-24 sm:px-6 sm:py-10 lg:pb-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/app/settings"
            aria-label="Back to settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Security
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Protect your VYBE account.
            </p>
          </div>
        </header>

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  <path d="M12 14v3" />
                </svg>
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900">
                  Change password
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Verify your current password before choosing a new one.
                </p>
                <p className="mt-2 break-all text-sm text-gray-700">
                  Account: {email}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleChangePassword}
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400"
                  placeholder="Enter new password again"
                />
              </div>

              <p className="text-xs leading-5 text-gray-500">
                Use a unique password that you do not use on other websites.
              </p>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {savingPassword ? "Updating password..." : "Update password"}
              </button>
            </form>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="13" rx="2" />
                  <path d="M8 21h8M12 17v4M7 8h10M7 12h5" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-gray-900">
                  Active sessions
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Sign out of other devices if you no longer recognize them or
                  have used a shared computer. Your current device stays signed
                  in.
                </p>

                <button
                  type="button"
                  onClick={handleSignOutOtherDevices}
                  disabled={signingOutOthers}
                  className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingOutOthers
                    ? "Signing out other devices..."
                    : "Sign out of other devices"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-gray-500">
          Keep your password private. VYBE will never ask you to share it
          with another person.
        </p>
      </div>
    </main>
  );
}
