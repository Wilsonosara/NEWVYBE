
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "../../../utils/supabase/client";

type StoryMedia = {
  mediaId: string;
  media: string;
  isVideo: boolean;
  text?: string | null;
};

type Story = {
  id: string;
  name: string;
  username: string;
  image: string;
  media?: string;
  mediaId?: string;
  isVideo?: boolean;
  mediaItems?: StoryMedia[];
  own?: boolean;
  createdAt: number;
};

type StoryRow = {
  id: string;
  user_id: string;
  media_path: string;
  media_type: "image" | "video";
  text_content: string | null;
  created_at: string;
  expires_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type StoryLikeRow = {
  story_id: string;
  user_id: string;
};

type StoryViewer = {
  viewer_id: string;
  viewed_at: string;
  name: string;
  username: string;
  avatar_url: string | null;
};

type StoryViewRow = {
  viewer_id: string;
  viewed_at: string;
};

type HighlightRow = {
  id: number;
  user_id: string;
  title: string;
  cover_story_id: string | null;
  created_at: string;
};

type HighlightItemRow = {
  id: number;
  highlight_id: number;
  story_id: string;
  media_path: string | null;
  media_type: "image" | "video" | null;
  story_owner_id: string | null;
  story_created_at: string | null;
  added_at: string;
};

type StoryHighlight = {
  id: number;
  title: string;
  cover: string | null;
  items: StoryMedia[];
};

const STORY_DURATION = 24 * 60 * 60 * 1000;
const MEDIA_DURATION = 5000;
const BUCKET = "post-media";
const PROFILE_KEY = "project-one-profile";

const sampleStories: Story[] = [
];

function PlusIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeartIcon({
  filled = false,
  size = 25,
}: {
  filled?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path
        d="M20.8 8.7c0 4.3-8.8 10.1-8.8 10.1S3.2 13 3.2 8.7A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.8 2.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 12s3.4-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.4 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function PlayPauseIcon({
  paused,
  size = 19,
}: {
  paused: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {paused ? (
        <path
          d="m8 5 11 7-11 7V5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d="M8 5v14M16 5v14"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function CloseIcon({ size = 21 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({
  direction,
  size = 14,
}: {
  direction: "up" | "down";
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {direction === "up" ? (
        <path
          d="m6 15 6-6 6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="m6 9 6 6 6-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function getMediaItems(story: Story): StoryMedia[] {
  if (story.mediaItems?.length) return story.mediaItems;

  if (story.media) {
    return [
      {
        mediaId: story.mediaId ?? story.id,
        media: story.media,
        isVideo: story.isVideo ?? false,
      },
    ];
  }

  return [];
}

function getProfileDetails() {
  let name = "Your Story";
  let username = "@you";

  try {
    const saved = localStorage.getItem(PROFILE_KEY);

    if (saved) {
      const profile = JSON.parse(saved);

      if (typeof profile.name === "string" && profile.name.trim()) {
        name = profile.name.trim();
      }

      if (
        typeof profile.username === "string" &&
        profile.username.trim()
      ) {
        username = profile.username.startsWith("@")
          ? profile.username
          : `@${profile.username}`;
      }
    }
  } catch {
    // Use the Supabase profile where available.
  }

  return { name, username };
}

function getDisplayName(profile?: ProfileRow) {
  return (
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    "VYBE User"
  );
}

function getUsername(profile?: ProfileRow) {
  const username = profile?.username?.trim() || "user";
  return username.startsWith("@") ? username : `@${username}`;
}

export default function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [reply, setReply] = useState("");
  const [likedStories, setLikedStories] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadingStories, setLoadingStories] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [liking, setLiking] = useState(false);
  const [storyViewers, setStoryViewers] = useState<StoryViewer[]>([]);
  const [showStoryViewers, setShowStoryViewers] = useState(false);
  const [loadingStoryViewers, setLoadingStoryViewers] = useState(false);

  // Highlights remain available for saving stories.
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [savingHighlight, setSavingHighlight] = useState(false);
  const [showSaveHighlight, setShowSaveHighlight] = useState(false);
  const [highlightTitle, setHighlightTitle] = useState("");
  const [selectedHighlightId, setSelectedHighlightId] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);

  const showNotice = useCallback((message: string) => {
    setNotice(message);

    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);

    noticeTimerRef.current = setTimeout(() => {
      setNotice("");
    }, 3500);
  }, []);

  const loadStories = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setStories(sampleStories);
        setLoadingStories(false);
        return;
      }

      const { data: storyRows, error: storiesError } = await supabase
        .from("stories")
        .select("id, user_id, media_path, media_type, text_content, created_at, expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (storiesError) throw storiesError;

      const rows = (storyRows ?? []) as StoryRow[];
      const userIds = [...new Set(rows.map((row) => row.user_id))];
      const storyIds = rows.map((row) => row.id);

      let profiles: ProfileRow[] = [];

      if (userIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        profiles = (profileRows ?? []) as ProfileRow[];
      }

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const grouped = new Map<string, StoryMedia[]>();

      for (const row of rows) {
        const { data } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(row.media_path);

        const items = grouped.get(row.user_id) ?? [];

        items.push({
          mediaId: row.id,
          media: data.publicUrl,
          isVideo: row.media_type === "video",
          text: row.text_content,
        });

        grouped.set(row.user_id, items);
      }

      const personalDetails = getProfileDetails();
      const onlineStories: Story[] = [];

      for (const [userId, items] of grouped.entries()) {
        if (items.length === 0) continue;

        const profile = profileMap.get(userId);
        const isOwnStory = userId === user.id;
        const cover = items[0];

        onlineStories.push({
          id: `user-${userId}`,
          name: isOwnStory
            ? personalDetails.name
            : getDisplayName(profile),
          username: isOwnStory
            ? personalDetails.username
            : getUsername(profile),
          image: profile?.avatar_url || cover.media,
          media: cover.media,
          mediaId: cover.mediaId,
          isVideo: cover.isVideo,
          mediaItems: items,
          own: isOwnStory,
          createdAt: Date.now(),
        });
      }

      onlineStories.sort((a, b) => {
        if (a.own) return -1;
        if (b.own) return 1;

        const aTime = rows
          .filter((row) => `user-${row.user_id}` === a.id)
          .reduce(
            (latest, row) =>
              Math.max(latest, new Date(row.created_at).getTime()),
            0
          );

        const bTime = rows
          .filter((row) => `user-${row.user_id}` === b.id)
          .reduce(
            (latest, row) =>
              Math.max(latest, new Date(row.created_at).getTime()),
            0
          );

        return bTime - aTime;
      });

      setStories([...onlineStories, ...sampleStories]);

      if (storyIds.length > 0) {
        const { data: likes, error: likesError } = await supabase
          .from("story_likes")
          .select("story_id, user_id")
          .in("story_id", storyIds);

        if (likesError) throw likesError;

        const likeRows = (likes ?? []) as StoryLikeRow[];
        const counts: Record<string, number> = {};
        const mine: string[] = [];

        for (const like of likeRows) {
          counts[like.story_id] = (counts[like.story_id] ?? 0) + 1;

          if (like.user_id === user.id) {
            mine.push(
              `user-${rows.find((row) => row.id === like.story_id)?.user_id ?? ""}`
            );
          }
        }

        setLikeCounts(counts);
        setLikedStories(mine);
      } else {
        setLikeCounts({});
        setLikedStories([]);
      }
    } catch (error) {
      console.error("Could not load stories:", error);
      showNotice("Could not load stories. Please refresh and try again.");
    } finally {
      loadingRef.current = false;
      setLoadingStories(false);
    }
  }, [showNotice]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadStories(), 0);

    const refresh = () => void loadStories();

    window.addEventListener("focus", refresh);

    const interval = setInterval(refresh, 15000);

    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(interval);
      clearTimeout(initialLoad);

      if (timerRef.current) clearTimeout(timerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [loadStories]);

  const loadHighlights = useCallback(async () => {
    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setHighlights([]);
        return;
      }

      const { data: highlightRows, error: highlightError } = await supabase
        .from("story_highlights")
        .select("id, user_id, title, cover_story_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (highlightError) throw highlightError;

      const rows = (highlightRows ?? []) as HighlightRow[];

      if (rows.length === 0) {
        setHighlights([]);
        return;
      }

      const { data: itemRows, error: itemsError } = await supabase
        .from("story_highlight_items")
        .select(
          "id, highlight_id, story_id, media_path, media_type, story_owner_id, story_created_at, added_at"
        )
        .in(
          "highlight_id",
          rows.map((row) => row.id)
        )
        .order("added_at", { ascending: true });

      if (itemsError) throw itemsError;

      const items = (itemRows ?? []) as HighlightItemRow[];
      const grouped = new Map<number, StoryMedia[]>();

      for (const item of items) {
        if (!item.media_path || !item.media_type) continue;

        const { data } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(item.media_path);

        const current = grouped.get(item.highlight_id) ?? [];

        current.push({
          mediaId: item.story_id,
          media: data.publicUrl,
          isVideo: item.media_type === "video",
        });

        grouped.set(item.highlight_id, current);
      }

      setHighlights(
        rows
          .map((row) => {
            const highlightItems = grouped.get(row.id) ?? [];

            const coverItem =
              highlightItems.find(
                (item) => item.mediaId === row.cover_story_id
              ) ?? highlightItems[0];

            return {
              id: row.id,
              title: row.title,
              cover: coverItem?.media ?? null,
              items: highlightItems,
            };
          })
          .filter((highlight) => highlight.items.length > 0)
      );
    } catch (error) {
      console.error("Could not load story highlights:", error);
      showNotice("Could not load highlights. Please refresh and try again.");
    }
  }, [showNotice]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadHighlights(), 0);

    return () => clearTimeout(initialLoad);
  }, [loadHighlights]);

  const activeStory = viewerIndex !== null ? stories[viewerIndex] : null;
  const activeMediaItems = activeStory ? getMediaItems(activeStory) : [];
  const activeMedia = activeMediaItems[mediaIndex] ?? null;

  const activeOwnerId = activeStory?.id.startsWith("user-")
    ? activeStory.id.slice("user-".length)
    : null;

  const saveStoryToHighlight = async () => {
    if (
      !activeStory ||
      !activeOwnerId ||
      !activeMedia?.mediaId ||
      savingHighlight
    ) {
      return;
    }

    if (activeMedia.mediaId.startsWith("sample-")) {
      showNotice("Demo stories cannot be saved to highlights.");
      return;
    }

    const title = highlightTitle.trim();

    if (!selectedHighlightId && !title) {
      showNotice("Choose a highlight or enter a title for a new one.");
      return;
    }

    setSavingHighlight(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in to save a highlight.");

      if (user.id !== activeOwnerId) {
        throw new Error("You can only save your own stories to highlights.");
      }

      let highlightId = selectedHighlightId
        ? Number(selectedHighlightId)
        : 0;

      if (!highlightId) {
        const { data: created, error: createError } = await supabase
          .from("story_highlights")
          .insert({
            user_id: user.id,
            title,
            cover_story_id: activeMedia.mediaId,
          })
          .select("id")
          .single();

        if (createError) throw createError;

        highlightId = created.id as number;
      }

      const { data: storyRow, error: storyError } = await supabase
        .from("stories")
        .select("id, user_id, media_path, media_type, created_at")
        .eq("id", activeMedia.mediaId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (storyError) throw storyError;

      if (!storyRow) {
        throw new Error("This story is no longer available to save.");
      }

      const { error: itemError } = await supabase
        .from("story_highlight_items")
        .upsert(
          {
            highlight_id: highlightId,
            story_id: storyRow.id,
            media_path: storyRow.media_path,
            media_type: storyRow.media_type,
            story_owner_id: storyRow.user_id,
            story_created_at: storyRow.created_at,
          },
          {
            onConflict: "highlight_id,story_id",
            ignoreDuplicates: true,
          }
        );

      if (itemError) throw itemError;

      if (selectedHighlightId) {
        const { error: coverError } = await supabase
          .from("story_highlights")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", highlightId)
          .eq("user_id", user.id);

        if (coverError) throw coverError;
      }

      setShowSaveHighlight(false);
      setHighlightTitle("");
      setSelectedHighlightId("");

      await loadHighlights();

      showNotice("Story saved to your highlight!");
    } catch (error) {
      console.error("Could not save story to highlight:", error);

      showNotice(
        error instanceof Error
          ? error.message
          : "Could not save this story to a highlight."
      );
    } finally {
      setSavingHighlight(false);
    }
  };

  // Record each viewer once and let the owner see who viewed each story item.
  useEffect(() => {
    let cancelled = false;

    if (!activeStory || !activeMedia?.mediaId || !activeOwnerId) {
      const resetTimeout = window.setTimeout(() => {
        setStoryViewers([]);
        setShowStoryViewers(false);
        setLoadingStoryViewers(false);
      }, 0);

      return () => {
        cancelled = true;
        clearTimeout(resetTimeout);
      };
    }

    const supabase = createClient();

    const updateStoryViews = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user || cancelled) return;

        if (activeOwnerId !== user.id) {
          const { error: insertError } = await supabase
            .from("story_views")
            .insert({
              story_id: activeMedia.mediaId,
              viewer_id: user.id,
            });

          // A duplicate means this account has already viewed this story item.
          if (insertError && insertError.code !== "23505") {
            console.warn("Could not record story view:", insertError);
          }

          if (!cancelled) setStoryViewers([]);

          return;
        }

        setLoadingStoryViewers(true);

        const { data: viewRows, error: viewsError } = await supabase
          .from("story_views")
          .select("viewer_id, viewed_at")
          .eq("story_id", activeMedia.mediaId)
          .order("viewed_at", { ascending: false });

        if (viewsError) throw viewsError;

        const views = (viewRows ?? []) as StoryViewRow[];
        const viewerIds = [...new Set(views.map((row) => row.viewer_id))];

        if (viewerIds.length === 0) {
          if (!cancelled) setStoryViewers([]);
          return;
        }

        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", viewerIds);

        if (profilesError) throw profilesError;

        const profiles = (profileRows ?? []) as ProfileRow[];
        const profileMap = new Map(
          profiles.map((profile) => [profile.id, profile])
        );

        const viewers: StoryViewer[] = views.map((view) => {
          const profile = profileMap.get(view.viewer_id);

          return {
            viewer_id: view.viewer_id,
            viewed_at: view.viewed_at,
            name: getDisplayName(profile),
            username: getUsername(profile),
            avatar_url: profile?.avatar_url ?? null,
          };
        });

        if (!cancelled) setStoryViewers(viewers);
      } catch (error) {
        if (!cancelled) {
          setStoryViewers([]);
          console.error("Could not load story viewers:", error);
        }
      } finally {
        if (!cancelled) setLoadingStoryViewers(false);
      }
    };

    const updateTimeout = window.setTimeout(() => {
      setShowStoryViewers(false);
      void updateStoryViews();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(updateTimeout);
    };
  }, [activeStory, activeMedia?.mediaId, activeOwnerId]);

  const activeIsLiked = activeStory
    ? likedStories.includes(activeStory.id)
    : false;

  const closeViewer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setViewerIndex(null);
    setMediaIndex(0);
    setPaused(false);
    setReply("");
    setShowStoryViewers(false);
  }, []);

  const nextStory = useCallback(() => {
    if (viewerIndex === null) return;

    const currentItems = getMediaItems(stories[viewerIndex]);

    if (mediaIndex < currentItems.length - 1) {
      setMediaIndex((current) => current + 1);
      return;
    }

    if (viewerIndex < stories.length - 1) {
      setViewerIndex((current) =>
        current === null ? null : current + 1
      );
      setMediaIndex(0);
    } else {
      closeViewer();
    }
  }, [viewerIndex, mediaIndex, stories, closeViewer]);

  const previousStory = useCallback(() => {
    if (viewerIndex === null) return;

    if (mediaIndex > 0) {
      setMediaIndex((current) => current - 1);
      return;
    }

    if (viewerIndex > 0) {
      const previousIndex = viewerIndex - 1;
      const previousItems = getMediaItems(stories[previousIndex]);

      setViewerIndex(previousIndex);
      setMediaIndex(Math.max(0, previousItems.length - 1));
    }
  }, [viewerIndex, mediaIndex, stories]);

  useEffect(() => {
    if (viewerIndex === null || paused) return;

    timerRef.current = setTimeout(nextStory, MEDIA_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [viewerIndex, mediaIndex, paused, nextStory]);

  const [pendingStoryFiles, setPendingStoryFiles] = useState<File[]>([]);
  const [storyText, setStoryText] = useState("");
  const [showStoryComposer, setShowStoryComposer] = useState(false);

  const addStory = (files?: FileList | null) => {
    if (!files || files.length === 0 || uploading) return;

    const selectedFiles = Array.from(files);

    if (
      selectedFiles.some(
        (file) =>
          !file.type.startsWith("image/") &&
          !file.type.startsWith("video/")
      )
    ) {
      showNotice("Please choose images or videos only.");

      if (fileRef.current) fileRef.current.value = "";

      return;
    }

    if (selectedFiles.some((file) => file.size > 50 * 1024 * 1024)) {
      showNotice("Each file must be smaller than 50 MB.");

      if (fileRef.current) fileRef.current.value = "";

      return;
    }

    setPendingStoryFiles(selectedFiles);
    setStoryText("");
    setShowStoryComposer(true);
  };

  const uploadStory = async () => {
    if (!pendingStoryFiles.length || uploading) return;

    const selectedFiles = pendingStoryFiles;
    setUploading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        showNotice("Please sign in before posting a story.");
        return;
      }

      for (const file of selectedFiles) {
        const extension =
          file.name.split(".").pop()?.toLowerCase() || "bin";

        const mediaPath = `${user.id}/stories/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(mediaPath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const mediaType = file.type.startsWith("video/")
          ? "video"
          : "image";

        const { error: insertError } = await supabase.from("stories").insert({
          user_id: user.id,
          media_path: mediaPath,
          media_type: mediaType,
          text_content: storyText.trim() || null,
          expires_at: new Date(Date.now() + STORY_DURATION).toISOString(),
        });

        if (insertError) {
          await supabase.storage.from(BUCKET).remove([mediaPath]);
          throw insertError;
        }
      }

      setViewerIndex(null);
      setMediaIndex(0);
      setShowStoryComposer(false);
      setPendingStoryFiles([]);
      setStoryText("");

      await loadStories();

      showNotice(
        selectedFiles.length > 1
          ? "Your pictures and videos have been added to your story!"
          : "Your story has been posted!"
      );
    } catch (error) {
      console.error("Could not upload story:", error);

      showNotice(
        error instanceof Error
          ? `Story upload failed: ${error.message}`
          : "Could not save your story. Please try again."
      );
    } finally {
      setUploading(false);

      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openFilePicker = () => {
    if (uploading || !fileRef.current) return;

    fileRef.current.value = "";
    fileRef.current.click();
  };

  const toggleStoryLike = async () => {
    if (!activeStory || !activeOwnerId || liking) {
      if (activeStory && !activeOwnerId) {
        showNotice("Demo stories cannot be liked.");
      }

      return;
    }

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      showNotice("Please sign in to like a story.");
      return;
    }

    if (activeOwnerId === user.id) {
      showNotice("You cannot like your own story.");
      return;
    }

    const activeMediaId = activeMedia?.mediaId;

    if (!activeMediaId) {
      showNotice("This story media cannot be liked.");
      return;
    }

    setLiking(true);

    try {
      if (activeIsLiked) {
        const { error } = await supabase
          .from("story_likes")
          .delete()
          .eq("story_id", activeMediaId)
          .eq("user_id", user.id);

        if (error) throw error;

        setLikedStories((current) =>
          current.filter((id) => id !== activeStory.id)
        );

        setLikeCounts((current) => ({
          ...current,
          [activeMediaId]: Math.max(
            0,
            (current[activeMediaId] ?? 0) - 1
          ),
        }));
      } else {
        const { error } = await supabase.from("story_likes").insert({
          story_id: activeMediaId,
          user_id: user.id,
        });

        if (error && error.code !== "23505") throw error;

        setLikedStories((current) =>
          current.includes(activeStory.id)
            ? current
            : [...current, activeStory.id]
        );

        if (!error) {
          setLikeCounts((current) => ({
            ...current,
            [activeMediaId]: (current[activeMediaId] ?? 0) + 1,
          }));
        }
      }
    } catch (error) {
      console.error("Could not update story like:", error);
      showNotice("Could not update your like. Please try again.");
    } finally {
      setLiking(false);
    }
  };

  const sendReply = async () => {
    const content = reply.trim();

    if (!content || !activeStory || sendingReply) return;

    if (!activeOwnerId) {
      showNotice("Replies to demo stories are not saved.");
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      showNotice("Please sign in to reply to a story.");
      return;
    }

    if (activeOwnerId === user.id) {
      showNotice("You cannot reply to your own story.");
      return;
    }

    setSendingReply(true);

    try {
      const { error } = await supabase.from("story_replies").insert({
        story_id: activeMedia?.mediaId,
        sender_id: user.id,
        recipient_id: activeOwnerId,
        content,
      });

      if (error) throw error;

      setReply("");
      setPaused(false);

      showNotice("Your reply has been sent to the story owner.");
    } catch (error) {
      console.error("Could not send story reply:", error);

      showNotice(
        error instanceof Error
          ? `Reply failed: ${error.message}`
          : "Could not send your reply. Please try again."
      );
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700">
              Moments
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Stories
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              See what your people are up to.
            </p>
          </div>

          <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
            24 hours
          </span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {loadingStories ? (
            <div className="flex h-32 w-full items-center justify-center text-sm text-gray-400">
              Loading stories...
            </div>
          ) : (
            <>
              {!stories.some(
                (story) => story.own && getMediaItems(story).length > 0
              ) && (
                <div className="w-[112px] shrink-0 sm:w-[126px]">
                  <button
                    onClick={openFilePicker}
                    disabled={uploading}
                    className="group block w-full overflow-hidden rounded-2xl text-left transition hover:-translate-y-1 disabled:opacity-60"
                    aria-label="Add your story"
                  >
                    <div className="aspect-square overflow-hidden rounded-2xl bg-green-50">
                      <div className="flex h-full w-full flex-col items-center justify-center text-green-800">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                          {uploading ? (
                            <span className="text-xl">…</span>
                          ) : (
                            <PlusIcon size={25} />
                          )}
                        </div>
                        <span className="mt-2 text-xs font-bold">
                          {uploading ? "Uploading..." : "Add story"}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {stories.map((story, index) => {
                const items = getMediaItems(story);
                const cover = items[0];

                return (
                  <div
                    key={story.id}
                    className="w-[112px] shrink-0 sm:w-[126px]"
                  >
                    <div className="group relative">
                      <button
                        onClick={() => {
                          setViewerIndex(index);
                          setMediaIndex(0);
                          setPaused(false);
                        }}
                        className="relative block w-full overflow-hidden rounded-2xl text-left transition hover:-translate-y-1"
                        aria-label={`View ${story.own ? "your" : story.name + "'s"} story`}
                      >
                        <div className="aspect-square overflow-hidden rounded-2xl border border-transparent bg-gray-100 group-hover:border-green-500">
                          {cover ? (
                            cover.isVideo ? (
                              <video
                                src={cover.media}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={cover.media}
                                alt={`${story.name}'s story`}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            )
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-green-50 text-green-800">
                              <PlusIcon size={25} />
                            </div>
                          )}
                        </div>

                        {!story.own && (
                          <div className="pointer-events-none absolute inset-0 rounded-2xl border-[3px] border-green-500" />
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent px-2 pb-2 pt-8">
                          <p className="truncate text-xs font-bold text-white">
                            {story.own ? "Your Story" : story.name}
                            {story.own && items.length > 1 && (
                              <span> · {items.length}</span>
                            )}
                          </p>
                        </div>
                      </button>

                      {story.own && cover && (
                        <button
                          onClick={openFilePicker}
                          disabled={uploading}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-green-600 text-white shadow hover:bg-green-500 disabled:opacity-60"
                          aria-label="Add more pictures to Your Story"
                        >
                          {uploading ? (
                            <span className="text-sm">…</span>
                          ) : (
                            <PlusIcon size={17} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => void addStory(event.target.files)}
        />

        {showStoryComposer && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              if (uploading) return;
              setShowStoryComposer(false);
              setPendingStoryFiles([]);
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-950">Add text to your story</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowStoryComposer(false);
                    setPendingStoryFiles([]);
                  }}
                  disabled={uploading}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
              <p className="mb-3 text-sm text-gray-600">
                {pendingStoryFiles.length} {pendingStoryFiles.length === 1 ? "item" : "items"} selected
              </p>
              <textarea
                value={storyText}
                onChange={(event) => setStoryText(event.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Write something..."
                aria-label="Story text"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-400"
              />
              <button
                type="button"
                onClick={() => void uploadStory()}
                disabled={uploading}
                className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              >
                {uploading ? "Posting..." : "Post story"}
              </button>
            </div>
          </div>
        )}

        {uploading && (
          <p className="mt-3 text-sm font-medium text-green-700">
            Uploading your story media...
          </p>
        )}

        {notice && (
          <p className="mt-3 break-words rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
            {notice}
          </p>
        )}
      </section>

      {/* Save a story to an existing highlight or create a new one. */}
      {showSaveHighlight && activeStory && activeMedia && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowSaveHighlight(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-950">
                Save to highlight
              </h3>

              <button
                type="button"
                onClick={() => setShowSaveHighlight(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            {highlights.length > 0 && (
              <label className="mb-3 block text-sm font-medium text-gray-700">
                Add to an existing highlight
                <select
                  value={selectedHighlightId}
                  onChange={(event) => {
                    setSelectedHighlightId(event.target.value);

                    if (event.target.value) setHighlightTitle("");
                  }}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-gray-400"
                >
                  <option value="">Create a new highlight instead</option>

                  {highlights.map((highlight) => (
                    <option key={highlight.id} value={String(highlight.id)}>
                      {highlight.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!selectedHighlightId && (
              <label className="block text-sm font-medium text-gray-700">
                New highlight title
                <input
                  value={highlightTitle}
                  onChange={(event) => setHighlightTitle(event.target.value)}
                  maxLength={40}
                  placeholder="e.g. Travel, Sports, Memories"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-400"
                />
              </label>
            )}

            <button
              type="button"
              onClick={() => void saveStoryToHighlight()}
              disabled={
                savingHighlight ||
                (!selectedHighlightId && !highlightTitle.trim())
              }
              className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingHighlight ? "Saving..." : "Save story"}
            </button>
          </div>
        </div>
      )}

      {/* Active story viewer */}
      {activeStory && viewerIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-2 sm:p-5"
          onClick={closeViewer}
        >
          <div
            className="relative flex h-[min(92vh,850px)] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-gray-950 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {activeMedia && (
              <div className="absolute inset-0">
                {activeMedia.isVideo ? (
                  <video
                    key={`${activeStory.id}-${mediaIndex}`}
                    src={activeMedia.media}
                    autoPlay
                    playsInline
                    controls
                    className="h-full w-full object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${activeStory.id}-${mediaIndex}`}
                    src={activeMedia.media}
                    alt={`${activeStory.name}'s story`}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}

            {activeMedia?.text && (
              <div className="pointer-events-none absolute inset-x-5 bottom-[24%] z-[5] flex justify-center">
                <p className="max-w-full whitespace-pre-wrap break-words rounded-xl bg-black/45 px-4 py-2 text-center text-lg font-semibold text-white shadow-lg">
                  {activeMedia.text}
                </p>
              </div>
            )}

            <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
              <div className="mb-4 flex gap-1">
                {activeMediaItems.map((item, index) => (
                  <div
                    key={`${activeStory.id}-progress-${index}`}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-white/40"
                  >
                    <div
                      className={`h-full rounded-full bg-white ${
                        index < mediaIndex
                          ? "w-full"
                          : index === mediaIndex
                            ? "w-full animate-[story-progress_5s_linear_forwards]"
                            : "w-0"
                      }`}
                      style={{
                        animationPlayState: paused ? "paused" : "running",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeStory.image}
                  alt=""
                  className="h-10 w-10 rounded-full border border-white/50 object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {activeStory.name}
                  </p>

                  <p className="text-xs text-white/70">
                    {activeStory.username} · Now
                    {activeMediaItems.length > 1 &&
                      ` · ${mediaIndex + 1}/${activeMediaItems.length}`}
                  </p>
                </div>

                {activeStory.own && activeOwnerId && activeMedia && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHighlightId("");
                      setHighlightTitle("");
                      setShowSaveHighlight(true);
                      setPaused(true);
                    }}
                    className="rounded-full bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25"
                  >
                    Save
                  </button>
                )}

                <button
                  onClick={() => setPaused((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
                  aria-label={paused ? "Resume story" : "Pause story"}
                >
                  <PlayPauseIcon paused={paused} />
                </button>

                <button
                  onClick={closeViewer}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
                  aria-label="Close story"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="absolute inset-y-24 left-0 z-10 w-1/3">
              <button
                className="h-full w-full"
                onClick={previousStory}
                aria-label="Previous picture or story"
              />
            </div>

            <div className="absolute inset-y-24 right-0 z-10 w-2/3">
              <button
                className="h-full w-full"
                onClick={nextStory}
                aria-label="Next picture or story"
              />
            </div>

            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
              <div className="mb-2 flex items-center justify-end gap-2 text-sm text-white">
                <span>
                  {activeMedia ? likeCounts[activeMedia.mediaId] ?? 0 : 0}{" "}
                  likes
                </span>
              </div>

              {activeStory.own && activeOwnerId && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowStoryViewers((current) => !current)
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
                  >
                    <EyeIcon />
                    <span>
                      {loadingStoryViewers
                        ? "Loading views..."
                        : `${storyViewers.length} views`}
                    </span>
                    <ChevronIcon
                      direction={showStoryViewers ? "up" : "down"}
                    />
                  </button>

                  {showStoryViewers && (
                    <div className="mt-2 max-h-32 overflow-y-auto rounded-xl bg-black/70 p-2">
                      {loadingStoryViewers ? (
                        <p className="px-2 py-2 text-xs text-white/70">
                          Loading viewers...
                        </p>
                      ) : storyViewers.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-white/70">
                          No views yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {storyViewers.map((viewer) => (
                            <div
                              key={viewer.viewer_id}
                              className="flex items-center gap-2"
                            >
                              {viewer.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={viewer.avatar_url}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                  {viewer.name.charAt(0).toUpperCase()}
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-white">
                                  {viewer.name}
                                </p>
                                <p className="truncate text-[11px] text-white/60">
                                  {viewer.username}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onFocus={() => setPaused(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void sendReply();
                  }}
                  placeholder="Reply to story..."
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-full border border-white/60 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/80 focus:border-white"
                />

                <button
                  onClick={() => void toggleStoryLike()}
                  disabled={liking}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:scale-110 disabled:opacity-50 ${
                    activeIsLiked ? "text-red-500" : "text-white"
                  }`}
                  aria-label={activeIsLiked ? "Unlike story" : "Like story"}
                >
                  <HeartIcon filled={activeIsLiked} size={26} />
                </button>

                <button
                  onClick={() => void sendReply()}
                  disabled={sendingReply || !reply.trim()}
                  className="rounded-full bg-green-600 px-4 py-3 text-sm font-bold hover:bg-green-500 disabled:opacity-50"
                >
                  {sendingReply ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes story-progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
