
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";

type AccountInfo = {
  email: string | null;
  userId: string;
};

type SettingItemProps = {
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
};

function SettingItem({
  title,
  description,
  href,
  disabled = false,
}: SettingItemProps) {
  const content = (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-4 ${
        disabled ? "cursor-default" : "transition hover:bg-gray-50"
      }`}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-gray-500">
          {description}
        </p>
      </div>

      {disabled ? (
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
          Coming soon
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="shrink-0 text-xl text-gray-400"
        >
          ›
        </span>
      )}
    </div>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export default function SettingsPage() {
  const router = useRouter();

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const loadAccount = useCallback(async () => {
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      setAccount({
        email: user.email ?? null,
        userId: user.id,
      });
    } catch (err) {
      console.error("Could not load settings account:", err);
      setError("We couldn't load your account information.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      if (active) {
        void loadAccount();
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadAccount]);

  const handleLogout = async () => {
    if (signingOut) return;

    setSigningOut(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Could not log out:", err);
      setError("We couldn't log you out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto min-h-screen w-full max-w-2xl border-x border-gray-100">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur">
          <Link
            href="/app"
            aria-label="Back to feed"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl transition hover:bg-gray-100"
          >
            ←
          </Link>

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-gray-500">
              Manage your account and preferences
            </p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadAccount();
              }}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="px-4 py-6">
          <section>
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Your account
            </h2>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-700">
                  {account?.email?.charAt(0).toUpperCase() || "U"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {loading
                      ? "Loading account..."
                      : account?.email || "Your account"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {account
                      ? "Signed in to VYBE"
                      : "Account information"}
                  </p>
                </div>

                <span className="text-xs text-gray-400">
                  {account ? "Active" : ""}
                </span>
              </div>

              <div className="border-t border-gray-100">
                <SettingItem
                  title="Edit profile"
                  description="Update your display name, username, and bio."
                  href="/app/profile"
                />
              </div>

              <div className="border-t border-gray-100">
                <SettingItem
                  title="Account information"
                  description="Manage your email and personal account details."
                  href="/app/settings/account"
                />
              </div>

              <div className="border-t border-gray-100">
                <SettingItem
                  title="Password and authentication"
                  description="Manage your password and sign-in security."
                  href="/app/settings/security"
                />
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Privacy and security
            </h2>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <SettingItem
                title="Privacy"
                description="Manage profile visibility and who can interact with you."
                href="/app/settings/privacy"
              />

              <div className="border-t border-gray-100">
                <SettingItem
                  title="Messages and interactions"
                  description="Choose who you prefer to receive messages from."
                  href="/app/settings/privacy"
                />
              </div>

              <div className="border-t border-gray-100">
                <SettingItem
                  title="Blocked accounts"
                  description="Manage accounts you no longer want to interact with."
                  href="/app/settings/blocked"
                />
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Notifications
            </h2>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <SettingItem
                title="Notification preferences"
                description="Manage activity alerts for likes, comments, follows, and messages."
                href="/app/settings/notifications"
              />

              <div className="border-t border-gray-100">
                <SettingItem
                  title="Your notifications"
                  description="View your latest activity and interactions."
                  href="/app/notifications"
                />
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              App preferences
            </h2>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <SettingItem
                title="Appearance"
                description="Personalize how VYBE looks."
                href="/app/settings/appearance"
              />

              <div className="border-t border-gray-100">
                <SettingItem
                  title="Accessibility and media"
                  description="Manage media playback and accessibility preferences."
                  href="/app/settings/accessibility"
                />
              </div>

              <div className="border-t border-gray-100">
                <SettingItem
                  title="Language"
                  description="Choose your preferred language."
                  href="/app/settings/language"
                />
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Help and support
            </h2>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <SettingItem
                title="Help center"
                description="Get help using VYBE."
                href="/app/settings/help"
              />

              <div className="border-t border-gray-100">
                <SettingItem
                  title="Community guidelines"
                  description="Learn about the standards that keep our community safe."
                  href="/app/settings/community-guidelines"
                />
              </div>
            </div>
          </section>

          <section className="mt-8">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={signingOut || loading || !account}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signingOut ? "Logging out..." : "Log out"}
            </button>

            <p className="mt-4 text-center text-xs text-gray-400">
              VYBE
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
