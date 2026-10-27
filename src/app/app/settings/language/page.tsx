
"use client";

import Link from "next/link";
import { useLanguage, supportedLanguages } from "../../LanguageProvider";

export default function LanguageSettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <main className="min-h-screen bg-white px-5 py-8 text-gray-900">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/app/settings"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← {t("backToSettings")}
        </Link>

        <h1 className="mt-8 text-2xl font-semibold">
          {t("language")}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          {t("languageDescription")}
        </p>

        <div className="mt-8">
          <label
            htmlFor="language"
            className="mb-2 block text-sm font-medium"
          >
            {t("displayLanguage")}
          </label>

          <select
            id="language"
            value={language}
            onChange={(event) =>
              setLanguage(
                event.target.value as (typeof supportedLanguages)[number]["value"]
              )
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
          >
            {supportedLanguages.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-5 text-sm text-gray-500">
          {t("preferenceSaved")}
        </p>
      </div>
    </main>
  );
}
