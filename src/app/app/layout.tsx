
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PostProvider } from "./PostContext";
import {
  LanguageProvider,
  useLanguage,
} from "./LanguageProvider";
import { createClient } from "../../../utils/supabase/client";
import { OnlinePresenceProvider } from "./PresenceProvider";

const NOTIFICATIONS_KEY = "project-one-notifications";

type Notification = {
  id: number;
  unread: boolean;
  type?: string;
};

type NotificationPreferences = {
  likes_comments: boolean;
  follows: boolean;
  messages: boolean;
  mentions: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  likes_comments: true,
  follows: true,
  messages: true,
  mentions: true,
};

function isNotificationEnabled(
  type: string | undefined,
  preferences: NotificationPreferences
) {
  const normalizedType = (type ?? "").toLowerCase();

  if (
    normalizedType.includes("like") ||
    normalizedType.includes("comment")
  ) {
    return preferences.likes_comments;
  }

  if (normalizedType.includes("follow")) {
    return preferences.follows;
  }

  if (normalizedType.includes("message")) {
    return preferences.messages;
  }

  if (normalizedType.includes("mention")) {
    return preferences.mentions;
  }

  return true;
}

async function loadNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("likes_comments, follows, messages, mentions")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Could not load notification preferences:", error);
    return DEFAULT_PREFERENCES;
  }

  return {
    likes_comments: data?.likes_comments ?? true,
    follows: data?.follows ?? true,
    messages: data?.messages ?? true,
    mentions: data?.mentions ?? true,
  };
}

function getLocalUnreadCount(
  preferences: NotificationPreferences
): number {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);

    if (!saved) return 0;

    const notifications = JSON.parse(saved) as Notification[];

    return notifications.filter(
      (notification) =>
        notification.unread &&
        isNotificationEnabled(notification.type, preferences)
    ).length;
  } catch (error) {
    console.error("Could not read local notification count:", error);
    return 0;
  }
}

function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  const updateUnreadCount = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Could not identify the signed-in user:", authError);
      setUnreadCount(0);
      return;
    }

    if (!user) {
      setUnreadCount(getLocalUnreadCount(DEFAULT_PREFERENCES));
      return;
    }

    const preferences = await loadNotificationPreferences(user.id);

    const { data, error } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Could not load unread notifications:", error);
      setUnreadCount(getLocalUnreadCount(preferences));
      return;
    }

    const enabledUnreadCount = (data ?? []).filter((notification) =>
      isNotificationEnabled(notification.type, preferences)
    ).length;

    setUnreadCount(enabledUnreadCount);
  }, []);

  useEffect(() => {
    let active = true;

    async function refreshCount() {
      if (!active) return;
      await updateUnreadCount();
    }

    void refreshCount();

    function handleRefresh() {
      void refreshCount();
    }

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("storage", handleRefresh);
    window.addEventListener(
      "project-one-notifications-updated",
      handleRefresh
    );
    window.addEventListener(
      "project-one-notification-preferences-updated",
      handleRefresh
    );

    return () => {
      active = false;
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
      window.removeEventListener(
        "project-one-notifications-updated",
        handleRefresh
      );
      window.removeEventListener(
        "project-one-notification-preferences-updated",
        handleRefresh
      );
    };
  }, [updateUnreadCount]);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}

function MessageBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  const updateUnreadCount = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Could not identify the signed-in user:", authError);
      return;
    }

    if (!user) {
      setUnreadCount(0);
      return;
    }

    const preferences = await loadNotificationPreferences(user.id);

    if (!preferences.messages) {
      setUnreadCount(0);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("actor_id")
      .eq("user_id", user.id)
      .eq("type", "message")
      .is("read_at", null);

    if (error) {
      console.error("Could not load unread message notifications:", error);
      return;
    }

    const unreadSenders = new Set(
      (data ?? [])
        .map((notification) => notification.actor_id)
        .filter((actorId): actorId is string => Boolean(actorId))
    );

    setUnreadCount(unreadSenders.size);
  }, []);

  useEffect(() => {
    let active = true;

    async function refreshCount() {
      if (!active) return;
      await updateUnreadCount();
    }

    void refreshCount();

    function handleRefresh() {
      void refreshCount();
    }

    window.addEventListener("focus", handleRefresh);
    window.addEventListener(
      "project-one-notifications-updated",
      handleRefresh
    );
    window.addEventListener("project-one-messages-updated", handleRefresh);
    window.addEventListener(
      "project-one-notification-preferences-updated",
      handleRefresh
    );

    return () => {
      active = false;
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener(
        "project-one-notifications-updated",
        handleRefresh
      );
      window.removeEventListener("project-one-messages-updated", handleRefresh);
      window.removeEventListener(
        "project-one-notification-preferences-updated",
        handleRefresh
      );
    };
  }, [updateUnreadCount]);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-7h6v7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function NotificationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8.5Z" />
    </svg>
  );
}

function CreateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function ConnectIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18 14a5.5 5.5 0 0 1 3.5 5.1" />
    </svg>
  );
}

function AppLayoutContent({ children }: { children: ReactNode }) {
  const { t } = useLanguage();

  const desktopIconClass =
    "relative flex h-12 w-12 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 hover:text-black active:scale-90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white";

  const worldIconClass =
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl text-gray-600 transition hover:bg-gray-100 hover:text-black dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white";

  return (
    <div className="min-h-screen overflow-x-clip bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-[#111111] dark:text-gray-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden w-20 shrink-0 border-r border-gray-200 bg-white transition-colors duration-200 dark:border-gray-800 dark:bg-[#1b1b1b] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col xl:w-20">
          {/* BRAND */}
          <div className="flex justify-center border-b border-gray-100 px-2 py-6 dark:border-gray-800">
            <Link
              href="/app"
              aria-label="VYBE home"
              title="VYBE"
              className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-extrabold tracking-tight text-gray-900 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              P.
            </Link>
          </div>

          {/* MAIN NAVIGATION: ICONS ONLY */}
          <nav
            aria-label="Main navigation"
            className="flex flex-col items-center gap-2 px-2 py-5"
          >
            <Link
              href="/app"
              aria-label={t("home")}
              title={t("home")}
              className={desktopIconClass}
            >
              <HomeIcon />
            </Link>

            <Link
              href="/app/explore"
              aria-label={t("search")}
              title={t("search")}
              className={desktopIconClass}
            >
              <SearchIcon />
            </Link>

            <Link
              href="/app/create"
              aria-label={t("create")}
              title={t("create")}
              className={desktopIconClass}
            >
              <CreateIcon />
            </Link>

            <Link
              href="/app/connect"
              aria-label={t("connect")}
              title={t("connect")}
              className={desktopIconClass}
            >
              <ConnectIcon />
            </Link>

            <Link
              href="/app/profile"
              aria-label={t("profile")}
              title={t("profile")}
              className={desktopIconClass}
            >
              <ProfileIcon />
            </Link>

            <Link
              href="/app/notifications"
              aria-label={t("notifications")}
              title={t("notifications")}
              className={desktopIconClass}
            >
              <NotificationIcon />
              <NotificationBadge />
            </Link>

            <Link
              href="/app/messages"
              aria-label={t("messages")}
              title={t("messages")}
              className={desktopIconClass}
            >
              <MessageIcon />
              <MessageBadge />
            </Link>
          </nav>

                 {/* WORLDS: SPORTS, SOCIAL, CAREER */}
        <div className="flex-1 overflow-y-auto border-t border-gray-100 px-2 py-5 dark:border-gray-800">
          <div
            className="mb-3 flex justify-center"
            title={t("worlds")}
            aria-label={t("worlds")}
          >
            <span className="text-gray-400">→</span>
          </div>

          <nav
            aria-label={t("worlds")}
            className="flex flex-col items-center gap-2"
          >
            <Link
              href="/app/sports"
              aria-label={t("sports")}
              title={t("sports")}
              className={worldIconClass}
            >
              ⚽
            </Link>

            <Link
              href="/app"
              aria-label={t("social")}
              title={t("social")}
              className={worldIconClass}
            >
              💬
            </Link>

            <Link
              href="/app/career"
              aria-label={t("career")}
              title={t("career")}
              className={worldIconClass}
            >
              💼
            </Link>
          </nav>
        </div>

          {/* COMPACT BRAND MARK */}
          <div className="p-3">
            <Link
              href="/app"
              aria-label={t("tagline")}
              title={`${t("yourWorld")} · ${t("yourPeople")} · ${t("yourStory")}`}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-black text-xl font-bold text-white transition hover:bg-gray-800"
            >
              P
            </Link>
          </div>
        </aside>

        {/* MAIN APPLICATION */}
        <div className="min-w-0 flex-1 pb-20 transition-colors duration-200 lg:pb-0">
          <PostProvider>{children}</PostProvider>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION: PRESERVED */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-lg transition-colors duration-200 dark:border-gray-800 dark:bg-[#1b1b1b]/95 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around py-2">
          <Link
            href="/app"
            aria-label={t("home")}
            title={t("home")}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 hover:text-black active:scale-90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <HomeIcon />
          </Link>

          <Link
            href="/app/explore"
            aria-label={t("search")}
            title={t("search")}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 hover:text-black active:scale-90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <SearchIcon />
          </Link>

          <Link
            href="/app/notifications"
            aria-label={t("notifications")}
            title={t("notifications")}
            className="relative flex h-12 w-12 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 hover:text-black active:scale-90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <NotificationIcon />
            <NotificationBadge />
          </Link>

          <Link
            href="/app/profile"
            aria-label={t("profile")}
            title={t("profile")}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 hover:text-black active:scale-90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ProfileIcon />
          </Link>

          <Link
            href="/app/messages"
            aria-label={t("messages")}
            title={t("messages")}
            className="relative flex h-12 w-12 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 hover:text-black active:scale-90 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <MessageIcon />
            <MessageBadge />
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LanguageProvider>
      <OnlinePresenceProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </OnlinePresenceProvider>
    </LanguageProvider>
  );
}
