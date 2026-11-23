
"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import ContactAvatarIcon from "./ContactAvatarIcon";
import { usePosts } from "./PostContext";

type StoryMedia = {
  mediaId: string;
  media: string;
  isVideo: boolean;
  text?: string | null;
  crop?: "cover" | "contain";
  theme?: "original" | "warm" | "cool" | "mono" | "vivid";
  captionX?: number;
  captionY?: number;
  captionSize?: "small" | "medium" | "large";
  captionColor?: "white" | "yellow" | "pink" | "cyan" | "black";
  captionItalic?: boolean;
  captionFont?: "sans" | "serif";
  captionBackground?: boolean;
  createdAt?: number;
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

const FRIEND_STORY_SHAPES = [
  "circle",
  "triangle",
  "circle",
  "inverted-triangle",
  "circle",
  "rectangle",
] as const;

function getFriendStoryShape(index: number) {
  return FRIEND_STORY_SHAPES[index % FRIEND_STORY_SHAPES.length];
}

function getFriendStoryClipPath(shape: (typeof FRIEND_STORY_SHAPES)[number]) {
  if (shape === "triangle") return "polygon(50% 0%, 100% 100%, 0% 100%)";
  if (shape === "inverted-triangle") return "polygon(0% 0%, 100% 0%, 50% 100%)";
  return undefined;
}

function getFriendStoryShapeClasses(shape: (typeof FRIEND_STORY_SHAPES)[number]) {
  if (shape === "circle") return "rounded-full";
  if (shape === "rectangle") return "rounded-md";
  return "";
}

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
const STORY_FILTERS = {
  original: "none",
  warm: "sepia(.28) saturate(1.2)",
  cool: "hue-rotate(12deg) saturate(1.15)",
  mono: "grayscale(1)",
  vivid: "saturate(1.5) contrast(1.08)",
} as const;
const STORY_CAPTION_SIZE_CLASSES = { small: "text-sm", medium: "text-lg", large: "text-2xl" } as const;
const STORY_CAPTION_COLOR_CLASSES = { white: "text-white", yellow: "text-yellow-200", pink: "text-pink-200", cyan: "text-cyan-200", black: "text-black" } as const;

async function renderEditedStoryImage(
  source: Blob,
  crop: "cover" | "contain",
  theme: keyof typeof STORY_FILTERS,
  zoom = 1,
  position = { x: 50, y: 50 }
) {
  const sourceUrl = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this story image.");
    context.fillStyle = theme === "warm" ? "#493023" : theme === "cool" ? "#172b43" : theme === "mono" ? "#202020" : theme === "vivid" ? "#33145d" : "#191326";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = crop === "cover"
      ? Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
      : Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale * zoom;
    const height = image.naturalHeight * scale * zoom;
    context.filter = STORY_FILTERS[theme];
    context.drawImage(image, (canvas.width - width) * position.x / 100, (canvas.height - height) * position.y / 100, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare this story image.")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

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
        createdAt: story.createdAt,
      },
    ];
  }

  return [];
}

function parseStoryEdit(text: string | null): {
  text: string | null;
  crop?: StoryMedia["crop"];
  theme?: StoryMedia["theme"];
  captionX?: number;
  captionY?: number;
  captionSize?: StoryMedia["captionSize"];
  captionColor?: StoryMedia["captionColor"];
  captionItalic?: boolean;
  captionFont?: StoryMedia["captionFont"];
  captionBackground?: boolean;
} {
  const match = text?.match(/^\[\[VYBE_STORY_EDIT:(.*?)\]\]\n?/);
  if (!match) return { text };

  try {
    const style = JSON.parse(decodeURIComponent(match[1])) as {
      crop?: string;
      theme?: string;
      captionX?: number;
      captionY?: number;
      captionSize?: string;
      captionColor?: string;
      captionItalic?: boolean;
      captionFont?: string;
      captionBackground?: boolean;
    };
    const crop: StoryMedia["crop"] = style.crop === "contain" ? "contain" : "cover";
    const themes = ["original", "warm", "cool", "mono", "vivid"] as const;
    const theme: StoryMedia["theme"] = themes.find((item) => item === style.theme) || "original";
    return {
      text: text?.slice(match[0].length) || null,
      crop,
      theme,
      captionX: typeof style.captionX === "number" ? Math.min(92, Math.max(8, style.captionX)) : 50,
      captionY: typeof style.captionY === "number" ? Math.min(92, Math.max(8, style.captionY)) : 76,
      captionSize: style.captionSize === "small" || style.captionSize === "large" ? style.captionSize : "medium",
      captionColor: ["white", "yellow", "pink", "cyan", "black"].includes(style.captionColor || "") ? style.captionColor as StoryMedia["captionColor"] : "white",
      captionItalic: style.captionItalic === true,
      captionFont: style.captionFont === "serif" ? "serif" : "sans",
      captionBackground: style.captionBackground !== false,
    };
  } catch {
    return { text };
  }
}

function shuffleStories(stories: Story[]) {
  const shuffled = [...stories];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function formatStoryAge(createdAt?: number) {
  if (createdAt === undefined || !Number.isFinite(createdAt)) return "Now";

  const ageInSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (ageInSeconds < 60) return "Just now";

  const ageInMinutes = Math.floor(ageInSeconds / 60);
  if (ageInMinutes < 60) return `${ageInMinutes}m`;

  const ageInHours = Math.floor(ageInMinutes / 60);
  if (ageInHours < 24) return `${ageInHours}h`;

  return `${Math.floor(ageInHours / 24)}d`;
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
  const { uploadFilesWithProgress, completeUploadProgress, failUploadProgress } = usePosts();
  const [stories, setStories] = useState<Story[]>([]);
  const [randomStories, setRandomStories] = useState<Story[]>([]);
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
  const [storyCrop, setStoryCrop] = useState<"cover" | "contain">("cover");
  const [storyCropZoom, setStoryCropZoom] = useState(1);
  const [storyCropPosition, setStoryCropPosition] = useState({ x: 50, y: 50 });
  const [storyTheme, setStoryTheme] = useState<keyof typeof STORY_FILTERS>("original");
  const [storyCaptionPosition, setStoryCaptionPosition] = useState({ x: 50, y: 76 });
  const [storyCaptionSize, setStoryCaptionSize] = useState<"small" | "medium" | "large">("medium");
  const [storyCaptionColor, setStoryCaptionColor] = useState<NonNullable<StoryMedia["captionColor"]>>("white");
  const [storyCaptionItalic, setStoryCaptionItalic] = useState(false);
  const [storyCaptionFont, setStoryCaptionFont] = useState<NonNullable<StoryMedia["captionFont"]>>("sans");
  const [storyCaptionBackground, setStoryCaptionBackground] = useState(true);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

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
        setRandomStories(shuffleStories(sampleStories));
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
        const storyEdit = parseStoryEdit(row.text_content);

        const items = grouped.get(row.user_id) ?? [];

        items.push({
          mediaId: row.id,
          media: data.publicUrl,
          isVideo: row.media_type === "video",
          text: storyEdit.text,
          crop: storyEdit.crop,
          theme: storyEdit.theme,
          captionX: storyEdit.captionX,
          captionY: storyEdit.captionY,
          captionSize: storyEdit.captionSize,
          captionColor: storyEdit.captionColor,
          captionItalic: storyEdit.captionItalic,
          captionFont: storyEdit.captionFont,
          captionBackground: storyEdit.captionBackground,
          createdAt: new Date(row.created_at).getTime(),
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
          createdAt: Math.max(
            ...items.map((item) => item.createdAt ?? Date.now())
          ),
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

      const allStories = [...onlineStories, ...sampleStories];
      setStories(allStories);
      setRandomStories(
        shuffleStories(
          allStories.filter((story) => getMediaItems(story).length > 0)
        )
      );
      // Story cards can render while the secondary like data finishes loading.
      setLoadingStories(false);

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
    window.addEventListener("project-one-stories-updated", refresh);

    const interval = setInterval(refresh, 15000);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("project-one-stories-updated", refresh);
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

  const deleteActiveStory = async () => {
    if (!activeStory?.own || !activeOwnerId || !activeMedia?.mediaId || deletingStoryId) return;
    setPaused(true);
    if (!window.confirm("Delete this story? This cannot be undone.")) {
      setPaused(false);
      return;
    }

    setDeletingStoryId(activeMedia.mediaId);
    try {
      const supabase = createClient();
      const { data: story, error: lookupError } = await supabase
        .from("stories")
        .select("media_path")
        .eq("id", activeMedia.mediaId)
        .eq("user_id", activeOwnerId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!story) throw new Error("This story could not be found.");

      const { error: deleteError } = await supabase
        .from("stories")
        .delete()
        .eq("id", activeMedia.mediaId)
        .eq("user_id", activeOwnerId);
      if (deleteError) throw deleteError;

      if (story.media_path) {
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove([story.media_path]);
        if (storageError) console.error("Story deleted, but media cleanup failed:", storageError);
      }

      const remainingCount = activeMediaItems.length - 1;
      if (remainingCount <= 0) closeViewer();
      else setMediaIndex((index) => Math.min(index, remainingCount - 1));
      await loadStories();
      showNotice("Story deleted.");
      window.dispatchEvent(new Event("project-one-stories-updated"));
    } catch (error) {
      console.error("Could not delete story:", error);
      setPaused(false);
      showNotice(error instanceof Error ? error.message : "Could not delete this story.");
    } finally {
      setDeletingStoryId(null);
    }
  };

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
  const [storyPreviewUrl, setStoryPreviewUrl] = useState("");
  const captionDragRef = useRef(false);
  const cropDragRef = useRef<{ x: number; y: number; position: { x: number; y: number } } | null>(null);

  useEffect(() => {
    const file = pendingStoryFiles[0];
    if (!showStoryComposer || !file) {
      setStoryPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setStoryPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingStoryFiles, showStoryComposer]);

  const moveComposerCaption = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    if (cropDragRef.current) {
      const drag = cropDragRef.current;
      setStoryCropPosition({
        x: Math.min(100, Math.max(0, drag.position.x - ((event.clientX - drag.x) / bounds.width) * 100)),
        y: Math.min(100, Math.max(0, drag.position.y - ((event.clientY - drag.y) / bounds.height) * 100)),
      });
      return;
    }
    if (!captionDragRef.current) return;
    setStoryCaptionPosition({
      x: Math.min(92, Math.max(8, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(92, Math.max(8, ((event.clientY - bounds.top) / bounds.height) * 100)),
    });
  };

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
    setStoryCrop("cover");
    setStoryCropZoom(1);
    setStoryCropPosition({ x: 50, y: 50 });
    setStoryTheme("original");
    setStoryCaptionPosition({ x: 50, y: 76 });
    setStoryCaptionSize("medium");
    setStoryCaptionColor("white");
    setStoryCaptionItalic(false);
    setStoryCaptionFont("sans");
    setStoryCaptionBackground(true);
    setShowStoryComposer(true);
  };

  const uploadStory = async () => {
    if (!pendingStoryFiles.length || uploading) return;

    const selectedFiles = pendingStoryFiles;
    setUploading(true);
    setShowStoryComposer(false);
    setViewerIndex(null);

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

      const preparedStories: Array<{
        mediaPath: string;
        mediaType: "image" | "video";
        uploadBlob: Blob;
        fileName: string;
        textContent: string;
      }> = [];

      for (const file of selectedFiles) {
        const mediaType = file.type.startsWith("video/") ? "video" : "image";
        const uploadBlob = mediaType === "image"
          ? await renderEditedStoryImage(file, storyCrop, storyTheme, storyCropZoom, storyCropPosition)
          : file;
        const extension = mediaType === "image"
          ? "png"
          : file.name.split(".").pop()?.toLowerCase() || "mp4";

        const mediaPath = `${user.id}/stories/${crypto.randomUUID()}.${extension}`;

        const storyStyle = encodeURIComponent(JSON.stringify({
          crop: mediaType === "video" ? storyCrop : "cover",
          theme: mediaType === "video" ? storyTheme : "original",
          captionX: storyCaptionPosition.x,
          captionY: storyCaptionPosition.y,
          captionSize: storyCaptionSize,
          captionColor: storyCaptionColor,
          captionItalic: storyCaptionItalic,
          captionFont: storyCaptionFont,
          captionBackground: storyCaptionBackground,
        }));

        preparedStories.push({
          mediaPath,
          mediaType,
          uploadBlob,
          fileName: file.name,
          textContent: `[[VYBE_STORY_EDIT:${storyStyle}]]\n${storyText.trim()}`.slice(0, 500),
        });
      }

      const unlinkedPaths = new Set(preparedStories.map((story) => story.mediaPath));
      try {
        await uploadFilesWithProgress(preparedStories.map((story) => ({
          path: story.mediaPath,
          blob: story.uploadBlob,
          fileName: story.fileName,
          contentType: story.uploadBlob.type,
        })), "story");

        for (const story of preparedStories) {
          const { error: insertError } = await supabase.from("stories").insert({
            user_id: user.id,
            media_path: story.mediaPath,
            media_type: story.mediaType,
            text_content: story.textContent,
            expires_at: new Date(Date.now() + STORY_DURATION).toISOString(),
          });

          if (insertError) throw insertError;
          unlinkedPaths.delete(story.mediaPath);
        }
      } catch (insertError) {
        if (unlinkedPaths.size > 0) {
          await supabase.storage.from(BUCKET).remove(Array.from(unlinkedPaths));
        }
        throw insertError;
      }

      completeUploadProgress();

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
      if (pendingStoryFiles.length > 0) setShowStoryComposer(true);
      failUploadProgress(error instanceof Error ? error.message : "Could not save your story. Please try again.", "story");

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

  const ownStory = stories.find((story) => story.own);
  const friendStories = stories.filter((story) => !story.own);

  const openStory = (story: Story) => {
    const index = stories.findIndex((item) => item.id === story.id);
    if (index < 0) return;
    setViewerIndex(index);
    setMediaIndex(0);
    setPaused(false);
  };

  useEffect(() => {
    if (loadingStories) return;
    const requestedUserId = window.sessionStorage.getItem("project-one-open-story-user");
    if (!requestedUserId) return;

    const requestedStory = stories.find((story) => story.id === `user-${requestedUserId}`);
    window.sessionStorage.removeItem("project-one-open-story-user");
    if (requestedStory) openStory(requestedStory);
  }, [loadingStories, openStory, stories]);

  return (
    <>
      <section className="space-y-6">
        <div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {loadingStories ? (
              <div className="py-5 text-sm text-gray-400">Loading stories…</div>
            ) : (
              <>
                <div className="relative w-[76px] shrink-0">
                  <button
                    type="button"
                    onClick={() => (ownStory ? openStory(ownStory) : openFilePicker())}
                    disabled={uploading}
                    className="flex w-full flex-col items-center gap-2 disabled:opacity-60"
                    aria-label={ownStory ? "View your story" : "Add your story"}
                  >
                    <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-dashed border-purple-500 p-1">
                      {ownStory?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ownStory.image} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-gray-700">
                          <PlusIcon size={27} />
                        </span>
                      )}
                    </span>
                    <span className="max-w-full truncate text-sm text-gray-800">Your Story</span>
                  </button>
                  {ownStory && (
                    <button
                      type="button"
                      onClick={openFilePicker}
                      disabled={uploading}
                      className="absolute right-0 top-[48px] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-purple-600 text-white disabled:opacity-60"
                      aria-label="Add to your story"
                      title="Add to your story"
                    >
                      <PlusIcon size={16} />
                    </button>
                  )}
                </div>

                {friendStories.map((story, index) => {
                  const shape = getFriendStoryShape(index + 1);
                  const shapeClasses = getFriendStoryShapeClasses(shape);
                  const clipPath = getFriendStoryClipPath(shape);

                  return (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => openStory(story)}
                      className="flex w-[76px] shrink-0 flex-col items-center gap-2"
                      aria-label={`View ${story.name}'s story`}
                    >
                      <span className="flex h-[76px] w-[76px] items-center justify-center">
                        <span
                          className={`relative block ${shape === "rectangle" ? "h-full w-[60px]" : "h-full w-full"} overflow-hidden bg-purple-600 ${shapeClasses}`}
                          style={clipPath ? { clipPath } : undefined}
                        >
                          <span
                            className={`absolute inset-[3px] overflow-hidden bg-white ${shapeClasses}`}
                            style={clipPath ? { clipPath } : undefined}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={story.image}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </span>
                        </span>
                      </span>
                      <span className="max-w-full truncate text-sm text-gray-800">{story.name}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-1">
            <h3 className="text-lg font-bold text-gray-950">Friends</h3>
            <span aria-hidden="true" className="text-2xl leading-none text-gray-500">›</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {loadingStories ? (
              <div className="py-5 text-sm text-gray-400">Loading stories…</div>
            ) : randomStories.length > 0 ? (
              randomStories.map((story) => {
                const cover = getMediaItems(story)[0];

                return (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => openStory(story)}
                    className="group relative h-[220px] w-[136px] shrink-0 overflow-hidden rounded-xl bg-gray-200 text-left sm:h-[250px] sm:w-[154px]"
                    aria-label={`View ${story.name}'s story`}
                  >
                    {cover?.isVideo ? (
                      <video src={cover.media} className="h-full w-full object-cover" muted playsInline />
                    ) : cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.media} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-amber-200 via-rose-200 to-violet-300" />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
                    <span className="absolute left-2 top-2 flex h-10 w-10 rounded-full border-2 border-purple-500 p-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={story.image} alt="" loading="lazy" className="h-full w-full rounded-full object-cover" />
                    </span>
                    <span className="absolute inset-x-2 bottom-2 text-left text-white">
                      <span className="block truncate text-sm font-bold">{story.name}</span>
                      <span className="block text-xs text-white/85">{formatStoryAge(cover?.createdAt)}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <button
                type="button"
                onClick={openFilePicker}
                disabled={uploading}
                className="flex h-[220px] w-[136px] shrink-0 flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-4 text-center text-white shadow-sm disabled:opacity-60 sm:h-[250px] sm:w-[154px]"
                aria-label="Add the first story"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <PlusIcon size={27} />
                </span>
                <span>
                  <span className="block text-sm font-bold">No active stories yet</span>
                  <span className="mt-1 block text-xs text-white/85">Share a story to get started</span>
                </span>
              </button>
            )}
          </div>
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
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3"
            onClick={() => {
              if (uploading) return;
              setShowStoryComposer(false);
              setPendingStoryFiles([]);
            }}
          >
            <div
              className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div><h3 className="text-lg font-bold text-gray-950">Edit your story</h3><p className="text-xs text-gray-500">Crop, style, and move your caption before posting</p></div>
                <button
                  type="button"
                  onClick={() => {
                    setShowStoryComposer(false);
                    setPendingStoryFiles([]);
                  }}
                  disabled={uploading}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                  aria-label="Close story editor"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
                <div className="relative mx-auto aspect-[9/16] h-[38dvh] max-h-[400px] w-auto max-w-full touch-none overflow-hidden rounded-2xl bg-[#191326]" onPointerDown={(event) => { if (!(event.target instanceof HTMLImageElement)) return; cropDragRef.current = { x: event.clientX, y: event.clientY, position: storyCropPosition }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={moveComposerCaption} onPointerUp={() => { captionDragRef.current = false; cropDragRef.current = null; }} onPointerCancel={() => { captionDragRef.current = false; cropDragRef.current = null; }}>
                  {pendingStoryFiles[0] && storyPreviewUrl && (pendingStoryFiles[0].type.startsWith("video/") ? (
                    <video src={storyPreviewUrl} muted playsInline controls className="h-full w-full" style={{ objectFit: storyCrop, filter: STORY_FILTERS[storyTheme] }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={storyPreviewUrl} alt="Story preview; drag to adjust crop" className="h-full w-full" style={{ objectFit: storyCrop, objectPosition: `${storyCropPosition.x}% ${storyCropPosition.y}%`, transform: `scale(${storyCropZoom})`, filter: STORY_FILTERS[storyTheme] }} />
                  ))}
                  {storyText && <button type="button" onPointerDown={(event) => { event.preventDefault(); captionDragRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); }} className={`absolute z-10 max-w-[88%] -translate-x-1/2 -translate-y-1/2 cursor-move touch-none rounded-xl px-3 py-2 text-center font-semibold shadow ${STORY_CAPTION_SIZE_CLASSES[storyCaptionSize]} ${STORY_CAPTION_COLOR_CLASSES[storyCaptionColor]} ${storyCaptionItalic ? "italic" : "not-italic"} ${storyCaptionFont === "serif" ? "font-serif" : "font-sans"} ${storyCaptionBackground ? storyCaptionColor === "black" ? "bg-white/85" : "bg-black/55" : "bg-transparent"}`} style={{ left: `${storyCaptionPosition.x}%`, top: `${storyCaptionPosition.y}%` }} aria-label="Drag caption to move it">{storyText}</button>}
                  {pendingStoryFiles.length > 1 && <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">{pendingStoryFiles.length} stories</span>}
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Crop</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["cover", "contain"] as const).map((crop) => <button key={crop} type="button" onClick={() => setStoryCrop(crop)} aria-pressed={storyCrop === crop} className={`rounded-xl border px-3 py-2 text-sm font-medium ${storyCrop === crop ? "border-purple-500 bg-purple-50 text-purple-800" : "border-gray-200"}`}>{crop === "cover" ? "Fill screen" : "Fit image"}</button>)}
                  </div>
                  {pendingStoryFiles[0] && !pendingStoryFiles[0].type.startsWith("video/") && <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-500">Drag the photo to position it. Adjust the crop below.</p>
                    <label className="block text-xs font-medium text-gray-600">Zoom <input aria-label="Zoom story photo crop" type="range" min="1" max="3" step="0.01" value={storyCropZoom} onChange={(event) => setStoryCropZoom(Number(event.target.value))} className="mt-1 w-full accent-purple-700" /></label>
                    <label className="block text-xs font-medium text-gray-600">Horizontal position <input aria-label="Set horizontal story crop position" type="range" min="0" max="100" value={storyCropPosition.x} onChange={(event) => setStoryCropPosition((current) => ({ ...current, x: Number(event.target.value) }))} className="mt-1 w-full accent-purple-700" /></label>
                    <label className="block text-xs font-medium text-gray-600">Vertical position <input aria-label="Set vertical story crop position" type="range" min="0" max="100" value={storyCropPosition.y} onChange={(event) => setStoryCropPosition((current) => ({ ...current, y: Number(event.target.value) }))} className="mt-1 w-full accent-purple-700" /></label>
                  </div>}
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold">Theme</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(Object.keys(STORY_FILTERS) as (keyof typeof STORY_FILTERS)[]).map((theme) => <button key={theme} type="button" onClick={() => setStoryTheme(theme)} aria-pressed={storyTheme === theme} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold capitalize ${storyTheme === theme ? "border-purple-500 bg-purple-50 text-purple-800" : "border-gray-200"}`}>{theme}</button>)}
                  </div>
                </div>
                <label className="block text-sm font-semibold">Add a caption
                  <textarea value={storyText} onChange={(event) => setStoryText(event.target.value.slice(0, 300))} maxLength={300} rows={2} placeholder="Write something…" aria-label="Story caption" className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-purple-400" />
                </label>
                <div className="space-y-3 rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 text-xs font-semibold text-gray-600">Text size
                      <select value={storyCaptionSize} onChange={(event) => setStoryCaptionSize(event.target.value as typeof storyCaptionSize)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-800">
                        <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => setStoryCaptionItalic((current) => !current)} aria-pressed={storyCaptionItalic} className={`mt-4 rounded-lg border px-3 py-2 text-sm font-serif italic ${storyCaptionItalic ? "border-purple-500 bg-purple-50 text-purple-800" : "border-gray-200 text-gray-600"}`}>Italic</button>
                    <button type="button" onClick={() => setStoryCaptionFont((current) => current === "sans" ? "serif" : "sans")} aria-pressed={storyCaptionFont === "serif"} className={`mt-4 rounded-lg border px-3 py-2 text-sm ${storyCaptionFont === "serif" ? "border-purple-500 bg-purple-50 font-serif text-purple-800" : "border-gray-200 font-sans text-gray-600"}`}>Font</button>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-gray-600">Text color</p>
                    <div className="flex gap-2">
                      {(["white", "yellow", "pink", "cyan", "black"] as const).map((color) => <button key={color} type="button" onClick={() => setStoryCaptionColor(color)} aria-label={`${color} caption text`} aria-pressed={storyCaptionColor === color} className={`h-8 w-8 rounded-full border-2 ${color === "white" ? "bg-white" : color === "yellow" ? "bg-yellow-200" : color === "pink" ? "bg-pink-200" : color === "cyan" ? "bg-cyan-200" : "bg-black"} ${storyCaptionColor === color ? "border-purple-600 ring-2 ring-purple-200" : "border-gray-300"}`} />)}
                    </div>
                  </div>
                  <button type="button" onClick={() => setStoryCaptionBackground((current) => !current)} aria-pressed={storyCaptionBackground} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600">{storyCaptionBackground ? "Remove text background" : "Add text background"}</button>
                </div>
                <button type="button" onClick={() => void uploadStory()} disabled={uploading} className="w-full rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-50">{uploading ? "Posting story…" : `Post ${pendingStoryFiles.length > 1 ? "stories" : "story"}`}</button>
              </div>
            </div>
          </div>
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
                    className="h-full w-full"
                    style={{ objectFit: activeMedia.crop ?? "contain", filter: ({ original: "none", warm: "sepia(.28) saturate(1.2)", cool: "hue-rotate(12deg) saturate(1.15)", mono: "grayscale(1)", vivid: "saturate(1.5) contrast(1.08)" })[activeMedia.theme ?? "original"] }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${activeStory.id}-${mediaIndex}`}
                    src={activeMedia.media}
                    alt={`${activeStory.name}'s story`}
                    className="h-full w-full"
                    style={{ objectFit: activeMedia.crop ?? "cover", filter: ({ original: "none", warm: "sepia(.28) saturate(1.2)", cool: "hue-rotate(12deg) saturate(1.15)", mono: "grayscale(1)", vivid: "saturate(1.5) contrast(1.08)" })[activeMedia.theme ?? "original"] }}
                  />
                )}
              </div>
            )}

            {activeMedia?.text && (
              <div
                className="pointer-events-none absolute z-[5] max-w-[90%] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${activeMedia.captionX ?? 50}%`, top: `${activeMedia.captionY ?? 76}%` }}
              >
                <p className={`whitespace-pre-wrap break-words rounded-xl px-4 py-2 text-center font-semibold shadow-lg ${STORY_CAPTION_SIZE_CLASSES[activeMedia.captionSize ?? "medium"]} ${STORY_CAPTION_COLOR_CLASSES[activeMedia.captionColor ?? "white"]} ${activeMedia.captionItalic ? "italic" : "not-italic"} ${activeMedia.captionFont === "serif" ? "font-serif" : "font-sans"} ${activeMedia.captionBackground === false ? "bg-transparent shadow-none" : activeMedia.captionColor === "black" ? "bg-white/85" : "bg-black/45"}`}>
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
                    {activeOwnerId ? (
                      <Link
                        href={`/app/profile?id=${encodeURIComponent(activeOwnerId)}`}
                        className="hover:text-white hover:underline"
                        aria-label={`View ${activeStory.name}'s profile`}
                      >
                        {activeStory.username}
                      </Link>
                    ) : (
                      activeStory.username
                    )}
                    <span> · {formatStoryAge(activeMedia?.createdAt)}</span>
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

                {activeStory.own && activeOwnerId && activeMedia && (
                  <button
                    type="button"
                    onClick={() => void deleteActiveStory()}
                    disabled={deletingStoryId === activeMedia.mediaId}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/25 text-white hover:bg-red-500/45 disabled:opacity-50"
                    aria-label="Delete this story"
                    title="Delete story"
                  >
                    {deletingStoryId === activeMedia.mediaId ? <span className="text-xs">…</span> : <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-.8 14H5.8L5 6m4 4v6m6-6v6" /></svg>}
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
                  aria-label="Back to stories"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 12H5m7 7-7-7 7-7" />
                  </svg>
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
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white/80">
                                  <ContactAvatarIcon className="h-5 w-5" />
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
