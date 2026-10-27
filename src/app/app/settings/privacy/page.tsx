
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../utils/supabase/client";

type MessagePermission = "everyone" | "followers" | "nobody";

export default function PrivacySettingsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [whoCanMessage, setWhoCanMessage] =
    useState<MessagePermission>("everyone");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    setUserId(user.id);

    const { data, error: queryError } = await supabase
      .from("account_privacy_settings")
      .select("is_private, who_can_message")
      .eq("user_id", user.id)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    if (data) {
      setIsPrivate(data.is_private);
      setWhoCanMessage(data.who_can_message);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadSettings(),
      0
    );

    return () => window.clearTimeout(initialLoad);
  }, [loadSettings]);

  async function saveSettings() {
    if (!userId || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const supabase = createClient();

    const { error: saveError } = await supabase
      .from("account_privacy_settings")
      .upsert(
        {
          user_id: userId,
          is_private: isPrivate,
          who_can_message: whoCanMessage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setSuccess("Your privacy preferences have been saved.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-8">
        <p className="text-sm text-gray-500">Loading privacy settings...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white px-5 py-8 text-gray-900">
      <header className="mb-8">
        <Link
          href="/app/settings"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Settings
        </Link>

        <h1 className="mt-5 text-2xl font-semibold">Privacy</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your account privacy and messaging preferences.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
        >
          {success}
        </div>
      )}

      <section className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between gap-5 p-5">
          <div>
            <h2 className="font-medium">Private account</h2>
            <p className="mt-1 text-sm leading-5 text-gray-500">
              Save your preference for keeping your account private.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            aria-label="Private account"
            onClick={() => {
              setIsPrivate((current) => !current);
              setSuccess("");
            }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              isPrivate ? "bg-gray-900" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                isPrivate ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="p-5">
          <h2 className="font-medium">Who can message you?</h2>
          <p className="mt-1 text-sm leading-5 text-gray-500">
            Choose your preferred messaging audience.
          </p>

          <div className="mt-4 space-y-3">
            {(
              [
                ["everyone", "Everyone", "Anyone can send you a message."],
                ["followers", "Followers", "People who follow you."],
                ["nobody", "Nobody", "No one can start a conversation with you."],
              ] as const
            ).map(([value, title, description]) => (
              <label
                key={value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="who-can-message"
                  value={value}
                  checked={whoCanMessage === value}
                  onChange={() => {
                    setWhoCanMessage(value);
                    setSuccess("");
                  }}
                  className="mt-1 accent-gray-900"
                />

                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="mt-1 block text-sm text-gray-500">
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={saveSettings}
        disabled={saving || !userId}
        className="mt-6 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        These preferences are saved to your account. Profile visibility and
        messaging restrictions must also be enforced by the relevant database
        policies before they can protect your account.
      </p>
    </main>
  );
}
