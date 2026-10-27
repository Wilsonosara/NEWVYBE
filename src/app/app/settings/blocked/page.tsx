
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../../utils/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function BlockedAccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const supabase = useMemo(() => createClient(), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setError("Please log in to manage blocked accounts.");
        return;
      }

      const [profilesResult, blockedResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .neq("id", user.id)
          .order("display_name", { ascending: true }),
        supabase
          .from("blocked_users")
          .select("blocked_id")
          .eq("blocker_id", user.id),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (blockedResult.error) throw blockedResult.error;

      setProfiles((profilesResult.data ?? []) as Profile[]);
      setBlockedIds(
        (blockedResult.data ?? []).map((item) => item.blocked_id)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load blocked accounts. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadData]);

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return [];

    return profiles
      .filter((profile) => {
        const username = profile.username?.toLowerCase() ?? "";
        const displayName = profile.display_name?.toLowerCase() ?? "";

        return username.includes(term) || displayName.includes(term);
      })
      .slice(0, 50);
  }, [profiles, search]);

  const blockedProfiles = useMemo(
    () =>
      blockedIds.map(
        (id) =>
          profiles.find((profile) => profile.id === id) ?? {
            id,
            username: null,
            display_name: null,
            avatar_url: null,
          }
      ),
    [blockedIds, profiles]
  );

  async function toggleBlock(profile: Profile) {
    if (busyId) return;

    setBusyId(profile.id);
    setError("");
    setNotice("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Please log in to manage blocked accounts.");
      }

      if (user.id === profile.id) {
        throw new Error("You cannot block your own account.");
      }

      const isBlocked = blockedIds.includes(profile.id);
      const name =
        profile.display_name || profile.username || "Account";

      if (isBlocked) {
        const { error: deleteError } = await supabase
          .from("blocked_users")
          .delete()
          .eq("blocker_id", user.id)
          .eq("blocked_id", profile.id);

        if (deleteError) throw deleteError;

        setBlockedIds((current) =>
          current.filter((id) => id !== profile.id)
        );

        setNotice(
          `${name} has been unblocked. Previous follow relationships are not automatically restored.`
        );
      } else {
        const { error: insertError } = await supabase
          .from("blocked_users")
          .insert({
            blocker_id: user.id,
            blocked_id: profile.id,
          });

        if (insertError) throw insertError;

        setBlockedIds((current) =>
          current.includes(profile.id)
            ? current
            : [...current, profile.id]
        );

        setNotice(
          `${name} has been blocked. Messaging and following between these accounts are restricted, and any existing follow relationships have been removed.`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusyId(null);
    }
  }

  function displayName(profile: Profile) {
    return (
      profile.display_name ||
      profile.username ||
      "VYBE user"
    );
  }

  function avatarLabel(profile: Profile) {
    return displayName(profile).charAt(0).toUpperCase();
  }

  function profileRow(profile: Profile, isBlocked: boolean) {
    const isBusy = busyId === profile.id;

    return (
      <div
        key={profile.id}
        className="flex items-center gap-3 border-b border-gray-100 py-4 last:border-b-0"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            avatarLabel(profile)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {displayName(profile)}
          </p>
          <p className="truncate text-sm text-gray-500">
            {profile.username
              ? `@${profile.username.replace(/^@/, "")}`
              : "VYBE"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void toggleBlock(profile)}
          disabled={Boolean(busyId)}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isBlocked
              ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              : "border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200"
          }`}
        >
          {isBusy
            ? "Please wait..."
            : isBlocked
              ? "Unblock"
              : "Block"}
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto min-h-screen w-full max-w-2xl px-5 pb-16">
        <header className="sticky top-0 z-10 -mx-5 flex items-center gap-4 border-b border-gray-100 bg-white px-5 py-4">
          <Link
            href="/app/settings"
            aria-label="Back to settings"
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-gray-700 transition hover:bg-gray-100"
          >
            ←
          </Link>

          <div>
            <h1 className="text-lg font-semibold">
              Blocked accounts
            </h1>
            <p className="text-sm text-gray-500">
              Manage who you block
            </p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={() => void loadData()}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {notice && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700"
          >
            {notice}
          </p>
        )}

        <section className="py-6">
          <h2 className="text-base font-semibold">
            Find an account
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Search for a registered user and block or unblock
            their account.
          </p>

          <div className="mt-4">
            <label
              htmlFor="blocked-account-search"
              className="sr-only"
            >
              Search people
            </label>
            <input
              id="blocked-account-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or username"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-400"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Loading accounts...
            </p>
          ) : search.trim() ? (
            filteredProfiles.length > 0 ? (
              <div className="mt-2">
                {filteredProfiles.map((profile) =>
                  profileRow(
                    profile,
                    blockedIds.includes(profile.id)
                  )
                )}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">
                No matching accounts found.
              </p>
            )
          ) : (
            <p className="py-6 text-sm text-gray-400">
              Enter a name or username to search.
            </p>
          )}
        </section>

        <section className="border-t border-gray-100 py-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              Blocked by you
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
              {blockedIds.length}
            </span>
          </div>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            These accounts are saved to your personal block list.
            You can unblock them at any time.
          </p>

          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Loading your list...
            </p>
          ) : blockedProfiles.length > 0 ? (
            <div className="mt-3">
              {blockedProfiles.map((profile) =>
                profileRow(profile, true)
              )}
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500">
                <span aria-hidden="true">⊘</span>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-800">
                No blocked accounts
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Accounts you block will appear here.
              </p>
            </div>
          )}
        </section>

        <p className="border-t border-gray-100 py-5 text-xs leading-5 text-gray-400">
          Blocking prevents direct messaging and follow relationships
          between the two accounts. Existing follows are removed when
          a block is created. Feed visibility and other interactions
          still need their own protections.
        </p>
      </div>
    </main>
  );
}
