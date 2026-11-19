
"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";
import { ensureProfileForUser } from "../../../../utils/supabase/ensure-profile";
import { usePosts } from "../PostContext";
import type { Post, PostMedia } from "../../lib/posts";
import { getMedia } from "../../lib/mediaStorage";

const PROFILE_KEY = "project-one-profile";
const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const DEFAULT_BIO =
  "Building connections, sharing ideas, and exploring every world. 🌍";

type ProfileData = {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatarUrl?: string | null;
};

type HighlightItem = {
  id: number;
  highlight_id: number;
  story_id: string;
  media_path: string | null;
  media_type: "image" | "video" | null;
  added_at: string;
};

type ProfileHighlight = {
  id: number;
  title: string;
  cover: string | null;
  items: {
    id: string;
    url: string;
    isVideo: boolean;
  }[];
};

function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function escapeUsernamePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function formatNameFromUsername(value: string) {
  const cleaned = value.trim().replace(/^@/, "");

  return cleaned
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatUsername(value: string) {
  const cleaned = normalizeUsername(value);
  return cleaned ? `@${cleaned}` : "";
}

function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "G";

  if (src) {
    return (
      <img
        src={src}
        alt={`${name || "Profile"} profile picture`}
        className={`${className} object-cover`}
      />
    );
  }

  return (
    <div
      aria-label={`${name || "Profile"} profile picture`}
      className={`${className} flex items-center justify-center bg-gray-100 font-semibold text-gray-700`}
    >
      {initial}
    </div>
  );
}

function ProfilePostTile({ post }: { post: Post }) {
  const [mediaUrl, setMediaUrl] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const fallbackMedia: PostMedia | undefined = post.mediaId && post.mediaType
    ? { mediaId: post.mediaId, mediaType: post.mediaType, mediaName: post.mediaName || "Post media" }
    : undefined;
  const mediaItems = post.mediaItems?.length ? post.mediaItems : fallbackMedia ? [fallbackMedia] : [];
  const media: PostMedia | undefined = mediaItems[Math.min(mediaIndex, Math.max(0, mediaItems.length - 1))];

  useEffect(() => {
    if (!media) return;
    const supabase = createClient();
    let objectUrl = "";
    let active = true;
    const loadMedia = async () => {
      if (media.mediaId.startsWith("post-media/")) {
        const { data } = supabase.storage
          .from("post-media")
          .getPublicUrl(media.mediaId.slice("post-media/".length));
        if (active) setMediaUrl(data.publicUrl);
        return;
      }

      try {
        const file = await getMedia(media.mediaId);
        if (!active || !file) return;
        objectUrl = URL.createObjectURL(file);
        setMediaUrl(objectUrl);
      } catch (error) {
        console.error("Could not load profile post media:", error);
      }
    };
    void loadMedia();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media?.mediaId]);

  const normalizedUsername = post.username.trim().replace(/^@/, "");
  const authorProfileUrl = normalizedUsername
    ? `/app/profile?username=${encodeURIComponent(normalizedUsername)}`
    : post.authorId
      ? `/app/profile?id=${encodeURIComponent(post.authorId)}`
      : "/app/profile";

  return (
    <>
      <button
        type="button"
        onClick={() => { setMediaIndex(0); setViewerOpen(true); }}
        aria-label={`Open post by ${post.author}: ${post.content || post.mediaName || "Post"}`}
        className="group relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-[#ddd8ff] via-[#f2eaff] to-[#c6b6ff]"
      >
        {mediaUrl && media?.mediaType === "video" ? (
          <video src={mediaUrl} muted playsInline className="h-full w-full object-cover" />
        ) : mediaUrl ? (
          <img src={mediaUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-medium leading-5 text-[#43396a]">
            {post.content || "VYBE post"}
          </span>
        )}
        {mediaUrl && post.content && (
          <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 text-xs font-medium text-white">
            {post.content}
          </span>
        )}
      </button>

      {viewerOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Post by ${post.author}`}
          onClick={() => setViewerOpen(false)}
        >
          <div className="relative flex h-full max-h-[900px] w-full max-w-3xl flex-col items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setViewerOpen(false)} aria-label="Back to profile" className="absolute left-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </button>
            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center touch-pan-y" onTouchStart={(event) => { touchStartXRef.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => {
              const startX = touchStartXRef.current;
              const endX = event.changedTouches[0]?.clientX;
              touchStartXRef.current = null;
              if (startX === null || endX === undefined || mediaItems.length < 2) return;
              const distance = startX - endX;
              if (Math.abs(distance) < 45) return;
              setMediaIndex((index) => Math.min(mediaItems.length - 1, Math.max(0, index + (distance > 0 ? 1 : -1))));
            }}>
              {mediaUrl && media?.mediaType === "video" ? (
                <video src={mediaUrl} controls autoPlay playsInline className="max-h-full max-w-full object-contain" />
              ) : mediaUrl ? (
                <img src={mediaUrl} alt={media?.mediaName || "Post image"} className="max-h-full max-w-full object-contain" />
              ) : (
                <p className="max-w-xl whitespace-pre-wrap text-center text-xl text-white">{post.content || "Post media is unavailable."}</p>
              )}
            </div>
            {mediaItems.length > 1 && <div className="flex items-center justify-center gap-1.5 py-2" role="tablist" aria-label="Post media">
              {mediaItems.map((item, index) => <button key={`${item.mediaId}-${index}`} type="button" role="tab" aria-label={`Show media ${index + 1} of ${mediaItems.length}`} aria-selected={mediaIndex === index} onClick={() => setMediaIndex(index)} className={`h-1.5 rounded-full transition-all ${mediaIndex === index ? "w-3 bg-white" : "w-1.5 bg-white/40"}`} />)}
            </div>}
            <div className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/10 p-3 text-white">
              <Link href={authorProfileUrl} onClick={() => setViewerOpen(false)} aria-label={`View ${post.author}'s profile`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                {post.author.trim().charAt(0).toUpperCase() || "V"}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={authorProfileUrl} onClick={() => setViewerOpen(false)} className="block truncate text-sm font-semibold hover:underline">{post.author}</Link>
                <span className="block truncate text-xs text-white/70">{post.username}</span>
                {post.content && <p className="mt-1 line-clamp-2 text-sm">{post.content}</p>}
              </div>
              <Link href={`/app?post=${post.id}`} onClick={() => setViewerOpen(false)} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-semibold text-gray-900">Open post</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProfilePageContent() {
  const { posts } = usePosts();
  const router = useRouter();
  const searchParams = useSearchParams();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentUserId, setCurrentUserId] = useState("");
  const [ownProfileLoading, setOwnProfileLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState(DEFAULT_BIO);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [draftName, setDraftName] = useState("");
  const [draftUsername, setDraftUsername] = useState("");
  const [draftBio, setDraftBio] = useState(DEFAULT_BIO);

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [tab, setTab] = useState("Posts");
  const [savedPostIds, setSavedPostIds] = useState<number[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<number[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  const [requestedUsername, setRequestedUsername] = useState<string | null>(
    () => {
      const requested = searchParams.get("username");
      return requested ? normalizeUsername(requested) : "";
    }
  );
  const [requestedProfileId, setRequestedProfileId] = useState<string | null>(
    () => searchParams.get("id")
  );
  const [publicProfile, setPublicProfile] = useState<ProfileData | null>(null);
  const [publicProfileLoading, setPublicProfileLoading] = useState(true);
  const [publicProfileNotFound, setPublicProfileNotFound] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState("");

  const [profileHighlights, setProfileHighlights] = useState<
    ProfileHighlight[]
  >([]);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [openedProfileHighlight, setOpenedProfileHighlight] =
    useState<ProfileHighlight | null>(null);
  const [profileHighlightIndex, setProfileHighlightIndex] = useState(0);

  useEffect(() => {
    const requested = searchParams.get("username");
    const requestedId = searchParams.get("id");

    const updateProfileRequest = window.setTimeout(() => {
      setRequestedUsername(requested ? normalizeUsername(requested) : "");
      setRequestedProfileId(requestedId);
    }, 0);

    return () => window.clearTimeout(updateProfileRequest);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedAvatarFile) {
      const clearPreview = window.setTimeout(
        () => setAvatarPreview(null),
        0
      );

      return () => window.clearTimeout(clearPreview);
    }

    const objectUrl = URL.createObjectURL(selectedAvatarFile);
    const updatePreview = window.setTimeout(
      () => setAvatarPreview(objectUrl),
      0
    );

    return () => {
      window.clearTimeout(updatePreview);
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedAvatarFile]);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setLogoutError("Unable to log out. Please try again.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError(
        "Unable to log out. Please check your connection and try again."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  function handleAvatarSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setProfileError("");
    setProfileMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setProfileError("Choose a JPG, PNG, WEBP, or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setProfileError("Your profile picture must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setSelectedAvatarFile(file);
  }

  async function uploadAvatar(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    file: File
  ) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
    const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Unable to upload profile picture:", uploadError);
      throw new Error(
        uploadError.message ||
          "Unable to upload your picture. Please try again."
      );
    }

    const { data } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("The picture uploaded, but its public URL was unavailable.");
    }

    return data.publicUrl;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadOwnProfile() {
      let localProfile: Partial<ProfileData> = {};

      try {
        const stored = localStorage.getItem(PROFILE_KEY);
        if (stored) localProfile = JSON.parse(stored) as Partial<ProfileData>;
      } catch {
        localProfile = {};
      }

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          setCurrentUserId("");
          return;
        }

        setCurrentUserId(user.id);

        const { data: loadedProfile, error: profileLoadError } = await supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileLoadError) {
          console.error("Unable to load profile:", profileLoadError);
        }

        let profile = loadedProfile;

        if (!profileLoadError) {
          try {
            profile = await ensureProfileForUser(supabase, user);
          } catch (profileCreateError) {
            console.error("Unable to create or repair profile:", profileCreateError);
          }
        }

        if (profile) {
          const nextName =
            profile.display_name ||
            formatNameFromUsername(profile.username || "") ||
            user.email?.split("@")[0] ||
            "VYBE member";

          const nextUsername = formatUsername(
            profile.username || user.email?.split("@")[0] || "user"
          );

          const nextBio = profile.bio || DEFAULT_BIO;
          const nextAvatarUrl: string | null = profile.avatar_url || null;

          setName(nextName);
          setUsername(nextUsername);
          setBio(nextBio);
          setAvatarUrl(nextAvatarUrl);

          setDraftName(nextName);
          setDraftUsername(nextUsername);
          setDraftBio(nextBio);

          try {
            localStorage.setItem(
              PROFILE_KEY,
              JSON.stringify({
                id: user.id,
                name: nextName,
                username: nextUsername,
                bio: nextBio,
                avatarUrl: nextAvatarUrl,
              })
            );
          } catch {
            // Supabase remains the primary source of truth.
          }
        } else {
          const metadataName = user.user_metadata?.full_name;
          const nextName =
            localProfile.name ||
            (typeof metadataName === "string" ? metadataName.trim() : "") ||
            user.email?.split("@")[0] ||
            "VYBE member";
          const nextUsername = formatUsername(
            localProfile.username || user.email?.split("@")[0] || "user"
          );
          const nextBio = localProfile.bio || DEFAULT_BIO;
          const nextAvatarUrl = localProfile.avatarUrl || null;

          setName(nextName);
          setUsername(nextUsername);
          setBio(nextBio);
          setAvatarUrl(nextAvatarUrl);

          setDraftName(nextName);
          setDraftUsername(nextUsername);
          setDraftBio(nextBio);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load profile:", error);

          if (localProfile.name) setName(localProfile.name);
          if (localProfile.username) {
            setUsername(formatUsername(localProfile.username));
          }
          if (localProfile.bio) setBio(localProfile.bio);
          if (localProfile.avatarUrl) setAvatarUrl(localProfile.avatarUrl);
        }
      } finally {
        if (!cancelled) setOwnProfileLoading(false);
      }
    }

    void loadOwnProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const isOwnProfile =
    (!requestedUsername && !requestedProfileId) ||
    (!!currentUserId && currentUserId === requestedProfileId) ||
    (!!username && normalizeUsername(username) === requestedUsername);

  useEffect(() => {
    if (!currentUserId || !isOwnProfile) return;

    let cancelled = false;
    async function loadProfileCollections() {
      try {
        const supabase = createClient();
        const [savedResult, likedResult] = await Promise.all([
          supabase.from("saved_posts").select("post_id").eq("user_id", currentUserId),
          supabase.from("post_likes").select("post_id").eq("user_id", currentUserId),
        ]);
        if (savedResult.error) throw savedResult.error;
        if (likedResult.error) throw likedResult.error;
        if (cancelled) return;
        setSavedPostIds((savedResult.data ?? []).map((row) => Number(row.post_id)));
        setLikedPostIds((likedResult.data ?? []).map((row) => Number(row.post_id)));
      } catch (error) {
        console.error("Unable to load profile collections:", error);
      }
    }

    void loadProfileCollections();
    const refreshCollections = () => void loadProfileCollections();
    window.addEventListener("project-one-saved-posts-updated", refreshCollections);
    window.addEventListener("project-one-likes-updated", refreshCollections);
    return () => {
      cancelled = true;
      window.removeEventListener("project-one-saved-posts-updated", refreshCollections);
      window.removeEventListener("project-one-likes-updated", refreshCollections);
    };
  }, [currentUserId, isOwnProfile]);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicProfile() {
      if (!requestedUsername && !requestedProfileId) {
        setPublicProfile(null);
        setPublicProfileNotFound(false);
        setPublicProfileLoading(false);
        return;
      }

      setPublicProfileLoading(true);
      setPublicProfileNotFound(false);

      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (
          user &&
          ((requestedProfileId && user.id === requestedProfileId) ||
            (username &&
              normalizeUsername(username) === requestedUsername))
        ) {
          setPublicProfile(null);
          setPublicProfileLoading(false);
          return;
        }

        const profileResult = requestedProfileId
          ? await supabase
              .from("profiles")
              .select("id, username, display_name, bio, avatar_url")
              .eq("id", requestedProfileId)
              .maybeSingle()
          : await supabase
              .from("profiles")
              .select("id, username, display_name, bio, avatar_url")
              .ilike(
                "username",
                escapeUsernamePattern(requestedUsername || "")
              )
              .maybeSingle();

        let profile = profileResult.data;
        let error = profileResult.error;

        if (!requestedProfileId && !profile && !error) {
          const escapedUsername = escapeUsernamePattern(
            requestedUsername || ""
          );
          const result = await supabase
            .from("profiles")
            .select("id, username, display_name, bio, avatar_url")
            .ilike("username", `@${escapedUsername}`)
            .maybeSingle();

          profile = result.data;
          error = result.error;
        }

        if (cancelled) return;

        if (error || !profile) {
          setPublicProfile(null);
          setPublicProfileNotFound(true);
          return;
        }

        setPublicProfile({
          id: profile.id,
          name:
            profile.display_name ||
            formatNameFromUsername(profile.username || ""),
          username: formatUsername(profile.username || ""),
          bio: profile.bio || DEFAULT_BIO,
          avatarUrl: profile.avatar_url || null,
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load public profile:", error);
          setPublicProfile(null);
          setPublicProfileNotFound(true);
        }
      } finally {
        if (!cancelled) setPublicProfileLoading(false);
      }
    }

    void loadPublicProfile();

    return () => {
      cancelled = true;
    };
  }, [requestedProfileId, requestedUsername, username]);

  const displayedProfile =
    (requestedUsername || requestedProfileId) && publicProfile
      ? publicProfile
      : null;
  const displayedName = displayedProfile?.name || name;
  const displayedUsername = displayedProfile?.username || username;
  const displayedBio = displayedProfile?.bio || bio;
  const displayedAvatarUrl = displayedProfile
    ? displayedProfile.avatarUrl || null
    : isOwnProfile
      ? avatarUrl
      : null;

  const profilePosts = posts.filter((post) => {
    const postAuthor = normalizeUsername(
      String(
        (post as { username?: string }).username ||
          (post as { authorUsername?: string }).authorUsername ||
          ""
      )
    );

    const postAuthorId = String(
      (post as { user_id?: string }).user_id ||
        (post as { authorId?: string }).authorId ||
        ""
    );

    if (displayedProfile) {
      return (
        postAuthorId === displayedProfile.id ||
        (!!postAuthor &&
          postAuthor === normalizeUsername(displayedProfile.username))
      );
    }

    return (
      postAuthorId === currentUserId ||
      (!!postAuthor && postAuthor === normalizeUsername(username))
    );
  });

  const savedPosts = posts.filter((post) => savedPostIds.includes(post.id));
  const likedPosts = posts.filter((post) => likedPostIds.includes(post.id));
  const profileTabs = isOwnProfile
    ? ["Posts", "Stories", "Saved", "Liked"]
    : ["Posts", "Stories"];

  useEffect(() => {
    let cancelled = false;

    async function loadFollowCounts() {
      const targetUserId = displayedProfile?.id || currentUserId;

      if (!targetUserId) {
        setFollowersCount(0);
        setFollowingCount(0);
        return;
      }

      try {
        const supabase = createClient();

        const [
          { count: followers, error: followersError },
          { count: following, error: followingError },
        ] = await Promise.all([
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", targetUserId),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", targetUserId),
        ]);

        if (cancelled) return;

        if (followersError) {
          console.error("Unable to load followers count:", followersError);
        }

        if (followingError) {
          console.error("Unable to load following count:", followingError);
        }

        setFollowersCount(followers || 0);
        setFollowingCount(following || 0);
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load follow counts:", error);
        }
      }
    }

    void loadFollowCounts();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, displayedProfile?.id]);

  useEffect(() => {
    let cancelled = false;

    async function checkFollowing() {
      if (
        !currentUserId ||
        !displayedProfile?.id ||
        currentUserId === displayedProfile.id
      ) {
        setIsFollowing(false);
        return;
      }

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", currentUserId)
          .eq("following_id", displayedProfile.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Unable to check follow status:", error);
          return;
        }

        setIsFollowing(!!data);
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to check follow status:", error);
        }
      }
    }

    void checkFollowing();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, displayedProfile?.id]);

  async function handleFollow() {
    if (!currentUserId || !displayedProfile?.id || followBusy) return;

    setFollowBusy(true);
    setFollowError("");

    try {
      const supabase = createClient();

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", displayedProfile.id);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount((count) => Math.max(0, count - 1));
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: displayedProfile.id,
        });

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount((count) => count + 1);

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: displayedProfile.id,
            actor_id: currentUserId,
            type: "follow",
            message: "started following you",
          });

        if (notificationError) {
          console.error(
            "Follow succeeded, but notification could not be created:",
            notificationError
          );
        }
      }
    } catch (error) {
      console.error("Unable to update follow status:", error);
      setFollowError("Unable to update follow status. Please try again.");
    } finally {
      setFollowBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadHighlights() {
      const targetUserId = displayedProfile?.id || currentUserId;

      if (!targetUserId) {
        setProfileHighlights([]);
        return;
      }

      setLoadingHighlights(true);

      try {
        const supabase = createClient();

        const { data: activeStories, error: activeStoriesError } = await supabase
          .from("stories")
          .select("id, media_path, media_type, expires_at")
          .eq("user_id", targetUserId)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: true });

        if (activeStoriesError) {
          console.error("Unable to load active profile stories:", activeStoriesError);
        }

        const activeStoryItems = (activeStories ?? [])
          .filter((story: { media_path: string | null }) => !!story.media_path)
          .map((story: { id: string; media_path: string; media_type: string }) => {
            const { data } = supabase.storage
              .from("post-media")
              .getPublicUrl(story.media_path);
            return {
              id: story.id,
              url: data.publicUrl,
              isVideo: story.media_type === "video",
            };
          });
        const activeStoryCard: ProfileHighlight | null = activeStoryItems.length
          ? {
              id: -1,
              title: "Recent stories",
              cover: activeStoryItems[activeStoryItems.length - 1].url,
              items: activeStoryItems,
            }
          : null;

        const { data: highlights, error } = await supabase
          .from("story_highlights")
          .select("*")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false });

        if (error) {
          if (
            !error.message.toLowerCase().includes("does not exist") &&
            !error.message.toLowerCase().includes("schema cache")
          ) {
            console.error("Unable to load story highlights:", error);
          }

          if (!cancelled) setProfileHighlights(activeStoryCard ? [activeStoryCard] : []);
          return;
        }

        if (!highlights?.length) {
          if (!cancelled) setProfileHighlights(activeStoryCard ? [activeStoryCard] : []);
          return;
        }

        const highlightIds = highlights.map(
          (highlight: { id: number }) => highlight.id
        );

        const { data: items, error: itemsError } = await supabase
          .from("story_highlight_items")
          .select("*")
          .in("highlight_id", highlightIds)
          .order("added_at", { ascending: true });

        if (itemsError) {
          console.error("Unable to load highlight items:", itemsError);
          if (!cancelled) setProfileHighlights(activeStoryCard ? [activeStoryCard] : []);
          return;
        }

        const groupedItems = new Map<number, HighlightItem[]>();

        for (const item of (items || []) as HighlightItem[]) {
          const existing = groupedItems.get(item.highlight_id) || [];
          existing.push(item);
          groupedItems.set(item.highlight_id, existing);
        }

        const mediaPaths = Array.from(
          new Set(
            (items || [])
              .map((item: HighlightItem) => item.media_path)
              .filter((path): path is string => !!path)
          )
        );

        const mediaUrls = new Map<string, string>();

        for (const path of mediaPaths) {
          const { data } = supabase.storage
            .from("post-media")
            .getPublicUrl(path);

          if (data?.publicUrl) mediaUrls.set(path, data.publicUrl);
        }

        const result: ProfileHighlight[] = highlights.map(
          (highlight: {
            id: number;
            title: string | null;
            cover: string | null;
          }) => {
            const highlightItems = groupedItems.get(highlight.id) || [];

            const mappedItems = highlightItems
              .map((item) => {
                const url = item.media_path
                  ? mediaUrls.get(item.media_path)
                  : undefined;

                if (!url) return null;

                return {
                  id: String(item.id),
                  url,
                  isVideo: item.media_type === "video",
                };
              })
              .filter(
                (
                  item
                ): item is {
                  id: string;
                  url: string;
                  isVideo: boolean;
                } => item !== null
              );

            return {
              id: highlight.id,
              title: highlight.title || "Highlights",
              cover: highlight.cover
                ? mediaUrls.get(highlight.cover) || highlight.cover
                : mappedItems[0]?.url || null,
              items: mappedItems,
            };
          }
        );

        if (!cancelled) {
          setProfileHighlights(
            [...(activeStoryCard ? [activeStoryCard] : []), ...result].filter((highlight) => highlight.items.length > 0)
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load story highlights:", error);
          setProfileHighlights([]);
        }
      } finally {
        if (!cancelled) setLoadingHighlights(false);
      }
    }

    void loadHighlights();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, displayedProfile?.id]);

  const saveProfile = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (savingProfile) return;

      setSavingProfile(true);
      setProfileError("");
      setProfileMessage("");

      const cleanedName = draftName.trim();
      const cleanedUsername = normalizeUsername(draftUsername);
      const cleanedBio = draftBio.trim();

      if (!cleanedName) {
        setProfileError("Please enter your display name.");
        setSavingProfile(false);
        return;
      }

      if (!cleanedUsername) {
        setProfileError("Please enter a username.");
        setSavingProfile(false);
        return;
      }

      if (!/^[a-z0-9._-]+$/.test(cleanedUsername)) {
        setProfileError(
          "Usernames can contain lowercase letters, numbers, dots, underscores, and hyphens."
        );
        setSavingProfile(false);
        return;
      }

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setProfileError("Please log in again to update your profile.");
          return;
        }

        let nextAvatarUrl = avatarUrl;

        if (selectedAvatarFile) {
          try {
            nextAvatarUrl = await uploadAvatar(
              supabase,
              user.id,
              selectedAvatarFile
            );
          } catch (error) {
            console.error("Profile picture upload failed:", error);
            setProfileError(
              error instanceof Error
                ? `Profile picture upload failed: ${error.message}`
                : "Profile picture upload failed. Please try again."
            );
            return;
          }
        }

        const { error } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            username: cleanedUsername,
            display_name: cleanedName,
            bio: cleanedBio,
            avatar_url: nextAvatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        if (error) {
          if (error.code === "23505") {
            setProfileError(
              "That username is already taken. Please choose another."
            );
          } else if (error.code === "42501") {
            setProfileError(
              "You do not have permission to update this profile. Please check your profile table policies."
            );
          } else {
            console.error("Unable to save profile:", error);
            setProfileError("Unable to save your profile. Please try again.");
          }

          return;
        }

        const nextUsername = formatUsername(cleanedUsername);
        const normalizedBio = cleanedBio || DEFAULT_BIO;

        setName(cleanedName);
        setUsername(nextUsername);
        setBio(normalizedBio);
        setAvatarUrl(nextAvatarUrl);

        setDraftName(cleanedName);
        setDraftUsername(nextUsername);
        setDraftBio(cleanedBio);

        setSelectedAvatarFile(null);
        if (avatarInputRef.current) avatarInputRef.current.value = "";

        setEditing(false);
        setProfileMessage("Profile updated successfully.");

        try {
          localStorage.setItem(
            PROFILE_KEY,
            JSON.stringify({
              id: user.id,
              name: cleanedName,
              username: nextUsername,
              bio: normalizedBio,
              avatarUrl: nextAvatarUrl,
            })
          );
        } catch {
          // Supabase remains the primary source of truth.
        }

        router.refresh();
      } catch (error) {
        console.error("Unable to save profile:", error);
        setProfileError("Unable to save your profile. Please try again.");
      } finally {
        setSavingProfile(false);
      }
    },
    [
      avatarUrl,
      draftBio,
      draftName,
      draftUsername,
      router,
      savingProfile,
      selectedAvatarFile,
    ]
  );

  if (
    ownProfileLoading ||
    (publicProfileLoading && (requestedUsername || requestedProfileId))
  ) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl bg-white px-4 py-8 text-gray-900">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded-lg bg-gray-100" />
          <div className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded bg-gray-100" />
                <div className="h-3 w-24 rounded bg-gray-100" />
              </div>
            </div>
            <div className="mt-4 h-3 w-full rounded bg-gray-100" />
            <div className="mt-2 h-3 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      </main>
    );
  }

  if (
    (requestedUsername || requestedProfileId) &&
    publicProfileNotFound &&
    !publicProfile
  ) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center bg-white px-5 py-12 text-center text-gray-900">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="3.5" />
            <path
              d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 className="mt-4 text-xl font-semibold">Profile not found</h1>

        <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
          This profile may have been removed or the username may be incorrect.
        </p>

        <Link
          href="/app"
          className="mt-5 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-[#f3f3f1] px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-[#eaeae7]"
        >
          Back to Feed
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-white px-3 pb-24 text-gray-900 sm:px-5">
      <header className="flex items-center justify-between border-b border-gray-100 py-2">
        <Link href="/app" className="text-lg font-extrabold tracking-tight text-black">
          VYBE<span className="text-[#7d22ef]">.</span>
        </Link>

        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <>
              <Link
                href="/app/settings"
                aria-label="Settings"
                title="Settings"
                className="flex h-16 w-16 items-center justify-center rounded-full text-gray-900 transition hover:bg-purple-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a7.8 7.8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a7.8 7.8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7.4 7.4 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a7.8 7.8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a7.8 7.8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7.4 7.4 0 0 1 0 2Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <details className="relative">
                <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-lg text-gray-700 hover:bg-purple-50" aria-label="More profile actions">⋮</summary>
                <button type="button" onClick={handleLogout} disabled={loggingOut} className="absolute right-0 top-6 z-20 whitespace-nowrap rounded-xl border border-gray-100 bg-white px-3 py-1.5 text-xs font-medium shadow-lg disabled:opacity-60">
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </details>
            </>
          )}
        </div>
      </header>

      {logoutError && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {logoutError}
        </p>
      )}

      {profileMessage && isOwnProfile && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
        >
          {profileMessage}
        </p>
      )}

      <section className="relative mt-3 bg-white px-2 pb-5 pt-1 sm:px-5">
        <div className="relative h-[100px] sm:h-[114px]">
          <div className="absolute left-0 top-0 h-[92px] w-[92px] rounded-full bg-white p-[4px] shadow-[0_0_0_3px_#7d22ef] sm:h-[106px] sm:w-[106px]">
            <Avatar src={displayedAvatarUrl} name={displayedName} className="h-full w-full rounded-full border-[3px] border-white bg-gray-200" />
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => {
                  setDraftName(name);
                  setDraftUsername(username);
                  setDraftBio(bio);
                  setSelectedAvatarFile(null);
                  setProfileError("");
                  setProfileMessage("");
                  setEditing(true);
                }}
                aria-label="Change profile picture"
                title="Change profile picture"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#7600ef] text-white shadow-md ring-2 ring-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 8.5h3l1.4-2h7.2l1.4 2h3v10H4z" strokeLinejoin="round" />
                  <circle cx="12" cy="13.5" r="3.2" />
                </svg>
              </button>
            )}
          </div>

          {isOwnProfile ? (
            <button
              type="button"
              onClick={() => {
                setDraftName(name);
                setDraftUsername(username);
                setDraftBio(bio);
                setSelectedAvatarFile(null);
                setProfileError("");
                setProfileMessage("");
                setEditing(true);
              }}
              className="absolute right-0 top-6 inline-flex items-center gap-2 rounded-full border border-[#ddddea] px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:border-[#7d22ef] hover:bg-purple-50 sm:px-6"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19.7 7.8a2.1 2.1 0 0 0-3-3L4 16.5Z" strokeLinejoin="round"/><path d="m14.9 6.6 3 3"/></svg>
              Edit Profile
            </button>
          ) : displayedProfile ? (
            <button type="button" onClick={handleFollow} disabled={followBusy || !currentUserId} className="absolute right-0 top-6 rounded-full border border-[#ddddea] px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-purple-50 disabled:opacity-60">
              {followBusy ? "Please wait..." : isFollowing ? "Following" : "Follow"}
            </button>
          ) : null}
        </div>

        <h1 className="truncate text-3xl font-extrabold tracking-tight text-black sm:text-4xl">{displayedName}</h1>
        <p className="mt-1 truncate text-lg font-medium text-[#69758c] sm:text-xl">{displayedUsername}</p>

        {displayedBio && <p className="mt-1.5 max-w-2xl whitespace-pre-wrap text-base leading-6 text-gray-900">{displayedBio}</p>}

        {followError && <p role="alert" className="mt-2 text-xs text-red-600">{followError}</p>}

        <div className="mt-3 grid grid-cols-3 divide-x divide-[#d9ddea]">
          <div className="px-2 text-center"><p className="text-xl font-bold leading-6 tabular-nums sm:text-2xl">{profilePosts.length}</p><p className="mt-1 text-sm text-[#69758c] sm:text-base">Posts</p></div>
          <div className="px-2 text-center"><p className="text-xl font-bold leading-6 tabular-nums sm:text-2xl">{followersCount}</p><p className="mt-1 text-sm text-[#69758c] sm:text-base">Followers</p></div>
          <div className="px-2 text-center"><p className="text-xl font-bold leading-6 tabular-nums sm:text-2xl">{followingCount}</p><p className="mt-1 text-sm text-[#69758c] sm:text-base">Following</p></div>
        </div>

        <div className="mt-5">
          <h2 className="mb-3 text-base font-bold text-gray-900">Highlights</h2>
          {profileHighlights.length ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {profileHighlights.map((highlight) => (
                <button
                  key={highlight.id}
                  type="button"
                  onClick={() => { setOpenedProfileHighlight(highlight); setProfileHighlightIndex(0); }}
                  className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#7d22ef] bg-gradient-to-br from-purple-200 to-violet-700 p-1"
                  aria-label={`Open highlight: ${highlight.title}`}
                >
                  <span className="block h-full w-full overflow-hidden rounded-full bg-white">
                    {highlight.cover && (highlight.items[0]?.isVideo ? <video src={highlight.cover} muted playsInline className="h-full w-full object-cover" /> : <img src={highlight.cover} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />)}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 line-clamp-1 bg-gradient-to-t from-black/75 to-transparent px-1 pb-1 pt-4 text-center text-[10px] font-semibold text-white">{highlight.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-3 text-sm text-gray-500">{loadingHighlights ? "Loading highlights…" : "No highlights yet."}</p>
          )}
        </div>
      </section>

      <section className="-mx-3 mt-2 border-y border-gray-100 bg-white sm:-mx-5">
        <div role="tablist" aria-label="Profile sections" className={`grid ${isOwnProfile ? "grid-cols-4" : "grid-cols-2"} border-b border-gray-100`}>
          {profileTabs.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
              className={`relative px-1 py-4 text-sm transition sm:text-base ${tab === item ? "font-semibold text-gray-950" : "font-medium text-[#69758c] hover:text-gray-900"}`}
            >
              {item}
              {tab === item && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-[#7d22ef] sm:inset-x-5" />}
            </button>
          ))}
        </div>

        {tab === "Posts" && (
          profilePosts.length ? (
            <div className="grid grid-cols-3 gap-1.5 p-2 sm:gap-2 sm:p-3">
              {profilePosts.map((post) => <ProfilePostTile key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <h3 className="text-base font-semibold text-gray-900">No posts yet</h3>
              <p className="mt-1 text-sm text-gray-500">Posts will show here when shared.</p>
              {isOwnProfile && <Link href="/app/create" className="mt-4 inline-flex rounded-full bg-[#7d22ef] px-5 py-2.5 text-sm font-semibold text-white">Create your first post</Link>}
            </div>
          )
        )}

        {tab === "Stories" && (
          profileHighlights.length ? (
            <div className="grid grid-cols-3 gap-1.5 p-2 sm:gap-2 sm:p-3">
              {profileHighlights.map((highlight) => (
                <button key={highlight.id} type="button" onClick={() => { setOpenedProfileHighlight(highlight); setProfileHighlightIndex(0); }} className="group relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-purple-200 to-violet-700">
                  {highlight.cover && (highlight.items[0]?.isVideo ? <video src={highlight.cover} muted playsInline className="h-full w-full object-cover" /> : <img src={highlight.cover} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />)}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-7 text-left text-xs font-semibold text-white">{highlight.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <h3 className="text-base font-semibold text-gray-900">No stories yet</h3>
              <p className="mt-1 text-sm text-gray-500">{loadingHighlights ? "Loading stories..." : "Saved story highlights will appear here."}</p>
            </div>
          )
        )}

        {tab === "Saved" && (
          savedPosts.length ? (
            <div className="grid grid-cols-3 gap-1.5 p-2 sm:gap-2 sm:p-3">
              {savedPosts.map((post) => <ProfilePostTile key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <h3 className="text-base font-semibold text-gray-900">No saved posts yet</h3>
              <p className="mt-1 text-sm text-gray-500">Posts you save from the feed will appear here.</p>
              <Link href="/app/saved" className="mt-4 inline-flex rounded-full bg-[#f3efff] px-5 py-2.5 text-sm font-semibold text-[#7415dd]">Open saved collection</Link>
            </div>
          )
        )}

        {tab === "Liked" && (
          likedPosts.length ? (
            <div className="grid grid-cols-3 gap-1.5 p-2 sm:gap-2 sm:p-3">
              {likedPosts.map((post) => <ProfilePostTile key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <h3 className="text-base font-semibold text-gray-900">No liked posts yet</h3>
              <p className="mt-1 text-sm text-gray-500">Posts you like from the feed will appear here.</p>
            </div>
          )
        )}
      </section>

      {isOwnProfile && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-4">
          <section className="my-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-gray-900">
                  Edit profile
                </h2>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Update how people see you on VYBE.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setSelectedAvatarFile(null);
                  setProfileError("");
                  if (avatarInputRef.current) {
                    avatarInputRef.current.value = "";
                  }
                }}
                disabled={savingProfile}
                aria-label="Close edit profile"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {profileError && (
              <p
                role="alert"
                className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {profileError}
              </p>
            )}

            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700">
                  Profile picture
                </label>

                <div className="flex items-center gap-4">
                  <Avatar
                    src={avatarPreview || avatarUrl}
                    name={draftName || name}
                    className="h-20 w-20 shrink-0 rounded-full border border-gray-200"
                  />

                  <div className="min-w-0 flex-1">
                    <input
                      ref={avatarInputRef}
                      id="profile-avatar"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarSelection}
                      disabled={savingProfile}
                      className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-full file:border file:border-gray-200 file:bg-[#f3f3f1] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-800 hover:file:bg-[#eaeae7] disabled:opacity-50"
                    />
                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      JPG, PNG, WEBP, or GIF. Maximum size: 5 MB.
                    </p>
                    {selectedAvatarFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAvatarFile(null);
                          if (avatarInputRef.current) {
                            avatarInputRef.current.value = "";
                          }
                        }}
                        disabled={savingProfile}
                        className="mt-2 text-xs font-semibold text-gray-600 underline underline-offset-2 hover:text-gray-900"
                      >
                        Remove selected image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-1.5 block text-xs font-semibold text-gray-700"
                >
                  Display name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  maxLength={60}
                  required
                  disabled={savingProfile}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-username"
                  className="mb-1.5 block text-xs font-semibold text-gray-700"
                >
                  Username
                </label>
                <input
                  id="profile-username"
                  type="text"
                  value={draftUsername}
                  onChange={(event) => setDraftUsername(event.target.value)}
                  maxLength={30}
                  required
                  disabled={savingProfile}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50"
                  placeholder="@username"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Use letters, numbers, dots, underscores, or hyphens.
                </p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label
                    htmlFor="profile-bio"
                    className="block text-xs font-semibold text-gray-700"
                  >
                    Bio
                  </label>
                  <span className="text-xs text-gray-400">
                    {draftBio.length}/200
                  </span>
                </div>
                <textarea
                  id="profile-bio"
                  value={draftBio}
                  onChange={(event) => setDraftBio(event.target.value)}
                  maxLength={200}
                  rows={4}
                  disabled={savingProfile}
                  className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50"
                  placeholder="Tell your community a little about yourself..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setSelectedAvatarFile(null);
                    setProfileError("");
                    if (avatarInputRef.current) {
                      avatarInputRef.current.value = "";
                    }
                  }}
                  disabled={savingProfile}
                  className="rounded-xl border border-gray-200 bg-[#f3f3f1] px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-[#eaeae7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl border border-gray-200 bg-[#f3f3f1] px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-[#eaeae7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {openedProfileHighlight && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black p-3 sm:p-6">
          <div className="relative flex h-full max-h-[850px] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-black">
            <div className="absolute left-0 right-0 top-0 z-10 flex gap-1 px-3 pt-3">
              {openedProfileHighlight.items.map((item, index) => (
                <div
                  key={item.id}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
                >
                  <div
                    className={`h-full rounded-full ${
                      index <= profileHighlightIndex
                        ? "bg-white"
                        : "bg-transparent"
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="absolute left-0 right-0 top-5 z-10 flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {openedProfileHighlight.title}
                </p>
                <p className="text-xs text-white/70">
                  {profileHighlightIndex + 1} of{" "}
                  {openedProfileHighlight.items.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenedProfileHighlight(null)}
                aria-label="Back to profile"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M19 12H5m7 7-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {openedProfileHighlight.items[profileHighlightIndex] && (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                {openedProfileHighlight.items[profileHighlightIndex].isVideo ? (
                  <video
                    key={openedProfileHighlight.items[profileHighlightIndex].id}
                    src={openedProfileHighlight.items[profileHighlightIndex].url}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-full w-full object-contain"
                  />
                ) : (
                  <img
                    key={openedProfileHighlight.items[profileHighlightIndex].id}
                    src={openedProfileHighlight.items[profileHighlightIndex].url}
                    alt={openedProfileHighlight.title}
                    className="max-h-full w-full object-contain"
                  />
                )}
              </div>
            )}

            <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-between px-2">
              <button
                type="button"
                aria-label="Previous highlight item"
                disabled={profileHighlightIndex <= 0}
                onClick={() =>
                  setProfileHighlightIndex((index) => Math.max(0, index - 1))
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 disabled:opacity-20"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="m15 18-6-6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Next highlight item"
                disabled={
                  profileHighlightIndex >=
                  openedProfileHighlight.items.length - 1
                }
                onClick={() =>
                  setProfileHighlightIndex((index) =>
                    Math.min(
                      openedProfileHighlight.items.length - 1,
                      index + 1
                    )
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 disabled:opacity-20"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="m9 18 6-6-6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent />
    </Suspense>
  );
}
