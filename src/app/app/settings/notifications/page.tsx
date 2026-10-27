
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../utils/supabase/client";

type Preferences = {
  likes_comments: boolean;
  follows: boolean;
  messages: boolean;
  mentions: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  likes_comments: true,
  follows: true,
  messages: true,
  mentions: true,
};

const SETTINGS = [
  {
    key: "likes_comments",
    title: "Likes and comments",
    description: "Get notified when people like or comment on your posts.",
  },
  {
    key: "follows",
    title: "New followers",
    description: "Get notified when someone starts following you.",
  },
  {
    key: "messages",
    title: "Messages",
    description: "Get notified when someone sends you a message.",
  },
  {
    key: "mentions",
    title: "Mentions",
    description: "Get notified when someone mentions you.",
  },
] as const;

export default function NotificationSettingsPage() {
  const router = useRouter();

  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data, error: loadError } = await supabase
        .from("notification_preferences")
        .select("likes_comments, follows, messages, mentions")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
      } else if (data) {
        setPreferences({
          likes_comments: data.likes_comments,
          follows: data.follows,
          messages: data.messages,
          mentions: data.mentions,
        });
      }

      setLoading(false);
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [router]);

  const updatePreference = useCallback(
    async (key: keyof Preferences, checked: boolean) => {
      if (!userId || saving) return;

      const previousPreferences = preferences;
      const nextPreferences = {
        ...previousPreferences,
        [key]: checked,
      };

      setPreferences(nextPreferences);
      setSaving(true);
      setError("");
      setStatus("");

      const supabase = createClient();

      const { error: saveError } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: userId,
            ...nextPreferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (saveError) {
        setPreferences(previousPreferences);
        setError(saveError.message);
      } else {
        setStatus("Your notification preferences have been saved.");

        // Refresh notification and message badges after a successful save.
        window.dispatchEvent(
          new Event("project-one-notification-preferences-updated")
        );
      }

      setSaving(false);
    },
    [preferences, saving, userId]
  );

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto min-h-screen w-full max-w-2xl border-x border-gray-100 px-4 pb-16">
        <header className="flex items-center gap-4 border-b border-gray-100 py-5">
          <Link
            href="/app/settings"
            aria-label="Back to settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-gray-700 transition hover:bg-gray-100"
          >
            ←
          </Link>

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Notification preferences
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Choose which notifications you receive.
            </p>
          </div>
        </header>

        {loading ? (
          <p className="py-12 text-sm text-gray-500">
            Loading your preferences...
          </p>
        ) : (
          <section className="mt-4">
            {SETTINGS.map((setting) => {
              const enabled = preferences[setting.key];

              return (
                <div
                  key={setting.key}
                  className="flex items-center justify-between gap-5 border-b border-gray-100 py-5"
                >
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium">
                      {setting.title}
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-gray-500">
                      {setting.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={setting.title}
                    disabled={saving}
                    onClick={() =>
                      void updatePreference(setting.key, !enabled)
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${
                      enabled ? "bg-gray-800" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              );
            })}

            <div className="min-h-8 pt-4 text-sm" aria-live="polite">
              {saving && (
                <p className="text-gray-500">
                  Saving your changes...
                </p>
              )}

              {!saving && status && (
                <p className="text-gray-600">{status}</p>
              )}

              {error && (
                <p className="text-red-600">
                  Could not load or save your preferences: {error}
                </p>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-400">
              Your preferences are saved to your account. Each account has
              its own notification settings.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
