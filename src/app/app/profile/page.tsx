
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
import MediaDisplay from "../MediaDisplay";

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

function ProfilePageContent() {
  const { posts } = usePosts();
  const router = useRouter();
  const searchParams = useSearchParams();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentUserId, setCurrentUserId] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const [name, setName] = useState("Genius");
  const [username, setUsername] = useState("@genius");
  const [bio, setBio] = useState(DEFAULT_BIO);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [draftName, setDraftName] = useState("Genius");
  const [draftUsername, setDraftUsername] = useState("@genius");
  const [draftBio, setDraftBio] = useState(DEFAULT_BIO);

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [tab, setTab] = useState("Posts");
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  const [requestedUsername, setRequestedUsername] = useState<string | null>(
    null
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

    const updateUsername = window.setTimeout(
      () => setRequestedUsername(requested ? normalizeUsername(requested) : ""),
      0
    );

    return () => window.clearTimeout(updateUsername);
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

        if (!profile && !profileLoadError) {
          try {
            profile = await ensureProfileForUser(supabase, user);
          } catch (profileCreateError) {
            console.error("Unable to create missing profile:", profileCreateError);
          }
        }

        if (profile) {
          const nextName =
            profile.display_name ||
            formatNameFromUsername(profile.username || "") ||
            "Genius";

          const nextUsername = formatUsername(
            profile.username || user.email?.split("@")[0] || "genius"
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
            "Genius";
          const nextUsername = formatUsername(
            localProfile.username || user.email?.split("@")[0] || "genius"
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
      }
    }

    void loadOwnProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const isOwnProfile =
    !requestedUsername ||
    (!!username && normalizeUsername(username) === requestedUsername);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicProfile() {
      if (!requestedUsername) {
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
          username &&
          normalizeUsername(username) === requestedUsername
        ) {
          setPublicProfile(null);
          setPublicProfileLoading(false);
          return;
        }

        const escapedUsername = escapeUsernamePattern(requestedUsername);
        let { data: profile, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .ilike("username", escapedUsername)
          .maybeSingle();

        if (!profile && !error) {
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
  }, [requestedUsername, username]);

  const displayedProfile =
    requestedUsername && publicProfile ? publicProfile : null;
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

          if (!cancelled) setProfileHighlights([]);
          return;
        }

        if (!highlights?.length) {
          if (!cancelled) setProfileHighlights([]);
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
          if (!cancelled) setProfileHighlights([]);
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
            result.filter((highlight) => highlight.items.length > 0)
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

  if (publicProfileLoading && requestedUsername) {
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

  if (requestedUsername && publicProfileNotFound && !publicProfile) {
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
      <header className="flex items-center justify-between border-b border-gray-100 py-4">
        <Link href="/app" className="text-lg font-bold tracking-tight">
          VYBE.
        </Link>

        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <>
              <Link
                href="/app/create"
                aria-label="Create post"
                title="Create post"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-[#f3f3f1] text-gray-700 transition hover:bg-[#eaeae7]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </Link>

              <Link
                href="/app/settings"
                aria-label="Settings"
                title="Settings"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-[#f3f3f1] text-gray-700 transition hover:bg-[#eaeae7]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a7.8 7.8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a7.8 7.8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7.4 7.4 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a7.8 7.8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a7.8 7.8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7.4 7.4 0 0 1 0 2Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full border border-gray-200 bg-[#f3f3f1] px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-[#eaeae7] disabled:opacity-60"
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
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

      <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar
            src={displayedAvatarUrl}
            name={displayedName}
            className="h-[68px] w-[68px] shrink-0 rounded-full border border-gray-200 sm:h-[76px] sm:w-[76px]"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-6 tracking-tight sm:text-xl">
                  {displayedName}
                </h1>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {displayedUsername}
                </p>
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
                    if (avatarInputRef.current) {
                      avatarInputRef.current.value = "";
                    }
                    setEditing(true);
                  }}
                  className="rounded-full border border-gray-200 bg-[#f3f3f1] px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-[#eaeae7] sm:px-4 sm:text-sm"
                >
                  Edit profile
                </button>
              ) : displayedProfile ? (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followBusy || !currentUserId}
                  className="rounded-full border border-gray-200 bg-[#f3f3f1] px-4 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-[#eaeae7] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                >
                  {followBusy
                    ? "Please wait..."
                    : isFollowing
                      ? "Following"
                      : "Follow"}
                </button>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/70 py-2.5">
              <div className="px-1 text-center">
                <p className="text-base font-bold leading-5 tabular-nums">
                  {profilePosts.length}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                  Posts
                </p>
              </div>

              <div className="px-1 text-center">
                <p className="text-base font-bold leading-5 tabular-nums">
                  {followersCount}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                  Followers
                </p>
              </div>

              <div className="px-1 text-center">
                <p className="text-base font-bold leading-5 tabular-nums">
                  {followingCount}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                  Following
                </p>
              </div>
            </div>
          </div>
        </div>

        {displayedBio && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-5 text-gray-700">
            {displayedBio}
          </p>
        )}

        {followError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {followError}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {isOwnProfile ? (
            <>
              <Link
                href="/app/create"
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-[#f3f3f1] px-3.5 py-2 text-xs font-semibold text-gray-800 transition hover:bg-[#eaeae7] sm:text-sm"
              >
                Create Post
              </Link>

              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 sm:text-sm"
              >
                Back to Feed
              </Link>

              <Link
                href="/app/explore"
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 sm:text-sm"
              >
                Discover People
              </Link>
            </>
          ) : (
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 sm:text-sm"
            >
              Back to Feed
            </Link>
          )}
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Story Highlights
          </h2>
          {loadingHighlights && (
            <span className="text-xs text-gray-400">Loading...</span>
          )}
        </div>

        {profileHighlights.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {profileHighlights.map((highlight) => (
              <button
                key={highlight.id}
                type="button"
                onClick={() => {
                  setOpenedProfileHighlight(highlight);
                  setProfileHighlightIndex(0);
                }}
                className="flex w-[76px] shrink-0 flex-col items-center gap-2 text-center"
              >
                <span className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-1">
                  {highlight.cover ? (
                    highlight.items[0]?.isVideo ? (
                      <video
                        src={highlight.cover}
                        className="h-full w-full rounded-xl object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={highlight.cover}
                        alt={highlight.title}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    )
                  ) : (
                    <span className="text-xs text-gray-400">Story</span>
                  )}
                </span>
                <span className="w-full truncate text-xs text-gray-700">
                  {highlight.title}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400">
            No story highlights yet.
          </p>
        )}
      </section>

      <section className="mt-5">
        <div className="grid grid-cols-3 border-y border-gray-100">
          {["Posts", "Media", "Saved"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`relative py-3 text-sm font-medium transition ${
                tab === item
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              {item}
              {tab === item && (
                <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-gray-900" />
              )}
            </button>
          ))}
        </div>

        {tab === "Posts" && (
          <div className="mt-4">
            {profilePosts.length > 0 ? (
              <div className="space-y-4">
                {profilePosts.map((post) => (
                  <article
                    key={post.id}
                    id={`post-${post.id}`}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
                  >
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                          src={displayedAvatarUrl}
                          name={displayedName}
                          className="h-9 w-9 shrink-0 rounded-full"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {displayedName}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {displayedUsername}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {(post as { world?: string }).world || ""}
                      </span>
                    </div>

                    {post.content && (
                      <div className="whitespace-pre-wrap px-4 pb-3 text-sm leading-6 text-gray-800">
                        {post.content}
                      </div>
                    )}

                    {(post as { mediaId?: string }).mediaId && (
                      <MediaDisplay
                        mediaId={(post as { mediaId: string }).mediaId}
                        mediaType={
                          (post as { mediaType?: "image" | "video" })
                            .mediaType || "image"
                        }
                        mediaName={
                          (post as { mediaName?: string }).mediaName || ""
                        }
                      />
                    )}

                    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                      <span className="text-xs text-gray-400">
                        Shared on VYBE
                      </span>
                      <Link
                        href={`/app?post=${post.id}`}
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                      >
                        View post
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-500">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <path d="M8 12h8M12 8v8" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">
                  No posts yet
                </h3>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Your posts will appear here when you share something.
                </p>
                {isOwnProfile && (
                  <Link
                    href="/app/create"
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-gray-200 bg-[#f3f3f1] px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-[#eaeae7]"
                  >
                    Create your first post
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "Media" && (
          <div className="mt-4">
            {profilePosts.filter(
              (post) => !!(post as { mediaId?: string }).mediaId
            ).length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {profilePosts
                  .filter((post) => !!(post as { mediaId?: string }).mediaId)
                  .map((post) => (
                    <Link
                      key={post.id}
                      href={`/app?post=${post.id}`}
                      className="aspect-square overflow-hidden rounded-lg bg-gray-100"
                    >
                      <MediaDisplay
                        mediaId={(post as { mediaId: string }).mediaId}
                        mediaType={
                          (post as { mediaType?: "image" | "video" })
                            .mediaType || "image"
                        }
                        mediaName={
                          (post as { mediaName?: string }).mediaName || ""
                        }
                      />
                    </Link>
                  ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-gray-200 px-5 py-12 text-center text-sm text-gray-400">
                No media posts yet.
              </p>
            )}
          </div>
        )}

        {tab === "Saved" && (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              Saved posts
            </h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Posts you save from the feed will be available in your Saved tab.
            </p>
            <Link
              href="/app"
              className="mt-4 inline-flex items-center justify-center rounded-full border border-gray-200 bg-[#f3f3f1] px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-[#eaeae7]"
            >
              Explore the feed
            </Link>
          </div>
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
                aria-label="Close story highlight"
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
                  <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
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
