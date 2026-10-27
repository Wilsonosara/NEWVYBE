
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "project-one-theme";

function getSavedTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem(THEME_KEY);

  if (stored === "dark" || stored === "system" || stored === "light") {
    return stored;
  }

  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  const isDark =
    theme === "dark" || (theme === "system" && prefersDark);

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

export default function AppearanceSettingsPage() {
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function selectTheme(nextTheme: Theme) {
    localStorage.setItem(THEME_KEY, nextTheme);
    setTheme(nextTheme);
    setSaved(true);

    window.dispatchEvent(new Event("project-one-theme-updated"));
  }

  const options: {
    value: Theme;
    title: string;
    description: string;
  }[] = [
    {
      value: "light",
      title: "Light",
      description: "A bright, clean appearance.",
    },
    {
      value: "dark",
      title: "Dark",
      description: "A darker appearance for low-light environments.",
    },
    {
      value: "system",
      title: "Use device settings",
      description: "Follow your device's light or dark setting.",
    },
  ];

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
              Appearance
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Personalize how VYBE looks.
            </p>
          </div>
        </header>

        <section className="mt-6">
          <h2 className="text-sm font-semibold">Theme</h2>
          <p className="mt-1 text-sm leading-5 text-gray-500">
            Choose how VYBE appears on this device.
          </p>

          <div className="mt-4 space-y-3">
            {options.map((option) => {
              const selected = theme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectTheme(option.value)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-gray-900" : "border-gray-300"
                    }`}
                  >
                    {selected && (
                      <span className="h-2.5 w-2.5 rounded-full bg-gray-900" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {option.title}
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 min-h-5 text-sm text-gray-500" aria-live="polite">
            {saved ? "Your appearance preference has been saved." : ""}
          </p>

          <p className="mt-2 text-xs leading-5 text-gray-400">
            Your preference is saved in this browser. Other pages need
            theme-aware styles before their colors will change consistently.
          </p>
        </section>
      </div>
    </main>
  );
}
