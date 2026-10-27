
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AccessibilityPreferences = {
  autoplay: boolean;
  reduceMotion: boolean;
  captions: boolean;
};

const STORAGE_KEY = "project-one-accessibility-preferences";

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  autoplay: false,
  reduceMotion: false,
  captions: false,
};

export default function AccessibilitySettingsPage() {
  const [preferences, setPreferences] =
    useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
          const parsed: unknown = JSON.parse(stored);

          if (parsed && typeof parsed === "object") {
            const values = parsed as Record<string, unknown>;

            setPreferences({
              autoplay:
                typeof values.autoplay === "boolean"
                  ? values.autoplay
                  : DEFAULT_PREFERENCES.autoplay,
              reduceMotion:
                typeof values.reduceMotion === "boolean"
                  ? values.reduceMotion
                  : DEFAULT_PREFERENCES.reduceMotion,
              captions:
                typeof values.captions === "boolean"
                  ? values.captions
                  : DEFAULT_PREFERENCES.captions,
            });
          }
        }
      } catch (error) {
        console.error("Could not load accessibility preferences:", error);
      }

      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function updatePreference(
    key: keyof AccessibilityPreferences,
    value: boolean
  ) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
    setSaved(false);
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setSaved(true);
    } catch (error) {
      console.error("Could not save accessibility preferences:", error);
      setSaved(false);
    }
  }

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
              Accessibility and media
            </h1>
            <p className="text-sm text-gray-500">
              Personalize your experience
            </p>
          </div>
        </header>

        <div className="space-y-6 px-4 py-6">
          <section>
            <h2 className="mb-1 text-base font-semibold">
              Media playback
            </h2>
            <p className="mb-4 text-sm leading-6 text-gray-500">
              Choose how videos and other media behave while you use Project
              One.
            </p>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <PreferenceToggle
                title="Autoplay videos"
                description="Allow supported videos to start playing automatically."
                checked={preferences.autoplay}
                disabled={!loaded}
                onChange={(value) => updatePreference("autoplay", value)}
              />

              <div className="border-t border-gray-100">
                <PreferenceToggle
                  title="Captions"
                  description="Prefer captions when a video provides them. Actual display depends on the video player and available caption tracks."
                  checked={preferences.captions}
                  disabled={!loaded}
                  onChange={(value) => updatePreference("captions", value)}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-base font-semibold">
              Accessibility
            </h2>
            <p className="mb-4 text-sm leading-6 text-gray-500">
              Adjust the experience to suit your needs.
            </p>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <PreferenceToggle
                title="Reduce motion"
                description="Save your preference to reduce unnecessary animations where supported."
                checked={preferences.reduceMotion}
                disabled={!loaded}
                onChange={(value) => updatePreference("reduceMotion", value)}
              />
            </div>
          </section>

          <div className="rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
            Your preferences are saved in this browser. They are not yet
            synchronized across your VYBE devices. Some settings also
            require the relevant media component to support them.
          </div>

          <button
            type="button"
            onClick={savePreferences}
            disabled={!loaded}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save preferences
          </button>

          {saved && (
            <p
              role="status"
              className="text-center text-sm text-gray-600"
            >
              Preferences saved successfully.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

type PreferenceToggleProps = {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function PreferenceToggle({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: PreferenceToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-gray-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-gray-800" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
