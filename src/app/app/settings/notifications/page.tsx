
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
  const [callAlertsEnabled, setCallAlertsEnabled] = useState(false);
  const [callAlertsBusy, setCallAlertsBusy] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushPermission("unsupported");
      return;
    }
    setPushPermission(Notification.permission);
  }, []);

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

  const enableCallAlerts = async () => {
    if (!userId || callAlertsBusy) return;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setError("Call alerts need push keys configured by the VYBE administrator.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setError("This browser does not support background call notifications.");
      return;
    }
    setCallAlertsBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") throw new Error("Allow notifications in your browser settings to receive call alerts.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const base64Key = vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(vapidPublicKey.length / 4) * 4, "=");
      const applicationServerKey = Uint8Array.from(atob(base64Key), (char) => char.charCodeAt(0));
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const { error: saveError } = await createClient().from("push_subscriptions").upsert({
        endpoint: subscription.endpoint,
        user_id: userId,
        subscription: subscription.toJSON(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (saveError) throw saveError;
      setCallAlertsEnabled(true);
      setStatus("Call alerts are enabled on this device.");
    } catch (enableError) {
      setError(enableError instanceof Error ? enableError.message : "Could not enable call alerts.");
    } finally {
      setCallAlertsBusy(false);
    }
  };

  const disableCallAlerts = async () => {
    if (!userId || callAlertsBusy) return;
    setCallAlertsBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const { error: deleteError } = await createClient().from("push_subscriptions").delete().eq("endpoint", subscription.endpoint).eq("user_id", userId);
        if (deleteError) throw deleteError;
        await subscription.unsubscribe();
      }
      setCallAlertsEnabled(false);
      setStatus("Call alerts are disabled on this device.");
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : "Could not disable call alerts.");
    } finally {
      setCallAlertsBusy(false);
    }
  };

  useEffect(() => {
    if (!userId || !("serviceWorker" in navigator)) return;
    let active = true;
    void navigator.serviceWorker.getRegistration("/").then((registration) => registration?.pushManager.getSubscription()).then(async (subscription) => {
      if (!subscription || !active) return;
      const { data } = await createClient().from("push_subscriptions").select("endpoint").eq("endpoint", subscription.endpoint).eq("user_id", userId).maybeSingle();
      if (active) setCallAlertsEnabled(Boolean(data));
    }).catch((loadError: unknown) => console.error("Could not load call notification settings:", loadError));
    return () => { active = false; };
  }, [userId]);

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
            <div className="flex items-center justify-between gap-5 border-b border-gray-100 py-5">
              <div className="min-w-0">
                <h2 className="text-sm font-medium">Incoming calls</h2>
                <p className="mt-1 text-sm leading-5 text-gray-500">Ring and show a device notification when someone calls, including when VYBE is in the background.</p>
                {pushPermission === "unsupported" && <p className="mt-1 text-xs text-amber-700">Background call alerts are not supported in this browser.</p>}
              </div>
              <button type="button" disabled={callAlertsBusy || pushPermission === "unsupported"} onClick={() => void (callAlertsEnabled ? disableCallAlerts() : enableCallAlerts())} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${callAlertsEnabled ? "bg-gray-700" : "bg-gray-900"}`}>
                {callAlertsBusy ? "Saving…" : callAlertsEnabled ? "Disable" : "Enable"}
              </button>
            </div>
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
