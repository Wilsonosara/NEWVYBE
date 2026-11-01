
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { type Post, type PostMedia } from "../lib/posts";
import { createClient } from "../../../utils/supabase/client";

type PostContextType = {
  posts: Post[];
  postComments: Record<number, PostComment[]>;
  addPost: (
    content: string,
    world: string,
    mediaFile?: File | File[],
    clubSlug?: string
  ) => Promise<void>;
  deletePost: (postId: number) => Promise<void>;
  likePost: (postId: number) => Promise<void>;
  unlikePost: (postId: number) => Promise<void>;
  addComment: (postId: number, comment: string) => Promise<void>;
};

export type PostComment = {
  author: string;
  username: string;
  content: string;
};

type DatabasePost = {
  id: number;
  user_id: string;
  author: string;
  username: string;
  content: string;
  world: string;
  likes: number;
  comments: number;
  media_path: string | null;
  media_type: "image" | "video" | null;
  media_name: string | null;
  media_items?: PostMedia[] | null;
  club_slug: string | null;
  created_at: string;
};

type DatabaseComment = {
  id: number;
  post_id: number;
  content: string;
  author: string;
  username: string;
  created_at: string;
};

type DatabaseLike = {
  post_id: number;
};

type BlockRelationship = {
  blocker_id: string;
  blocked_id: string;
};

type UploadedMedia = {
  storagePath: string;
  media: PostMedia;
};

const PostContext = createContext<PostContextType | null>(null);

function formatPostTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString();
}

function isValidPostMedia(value: unknown): value is PostMedia {
  if (!value || typeof value !== "object") return false;

  const media = value as Partial<PostMedia>;

  return (
    typeof media.mediaId === "string" &&
    (media.mediaType === "image" || media.mediaType === "video") &&
    typeof media.mediaName === "string"
  );
}

function mapDatabasePost(row: DatabasePost): Post {
  const storedMediaItems = Array.isArray(row.media_items)
    ? row.media_items.filter(isValidPostMedia)
    : [];

  const mediaItems: PostMedia[] =
    storedMediaItems.length > 0
      ? storedMediaItems
      : row.media_path
        ? [
            {
              mediaId: row.media_path,
              mediaType: row.media_type ?? "image",
              mediaName: row.media_name ?? "Post media",
            },
          ]
        : [];

  const firstMedia = mediaItems[0];

  return {
    id: Number(row.id),
    author: row.author,
    username: row.username,
    authorId: row.user_id,
    content: row.content,
    world: row.world,
    likes: Number(row.likes ?? 0),
    comments: Number(row.comments ?? 0),
    time: formatPostTime(row.created_at),
    ...(row.club_slug ? { clubSlug: row.club_slug } : {}),
    ...(firstMedia
      ? {
          mediaId: firstMedia.mediaId,
          mediaType: firstMedia.mediaType,
          mediaName: firstMedia.mediaName,
        }
      : {}),
    ...(mediaItems.length > 0 ? { mediaItems } : {}),
  };
}

function countLikes(rows: DatabaseLike[]) {
  const counts: Record<number, number> = {};

  for (const row of rows) {
    const postId = Number(row.post_id);
    counts[postId] = (counts[postId] ?? 0) + 1;
  }

  return counts;
}

function getStoragePath(mediaId: string | null | undefined) {
  if (!mediaId) return null;

  const prefix = "post-media/";

  if (!mediaId.startsWith(prefix)) return null;

  return mediaId.slice(prefix.length);
}

export function PostProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postComments, setPostComments] = useState<
    Record<number, PostComment[]>
  >({});
  const [isLoaded, setIsLoaded] = useState(false);

  const postsRef = useRef<Post[]>([]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (active) {
            postsRef.current = [];
            setPosts([]);
            setPostComments({});
          }

          return;
        }

        const { data: blockRows, error: blockError } = await supabase
          .from("blocked_users")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

        if (blockError) throw blockError;
        if (!active) return;

        const blockedAccountIds = new Set<string>();

        for (const relationship of (blockRows ??
          []) as BlockRelationship[]) {
          if (relationship.blocker_id === user.id) {
            blockedAccountIds.add(relationship.blocked_id);
          }

          if (relationship.blocked_id === user.id) {
            blockedAccountIds.add(relationship.blocker_id);
          }
        }

        const { data, error } = await supabase
          .from("posts")
          .select(
            "id, user_id, author, username, content, world, likes, comments, media_path, media_type, media_name, media_items, club_slug, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        if (!active) return;

        const allRows = (data ?? []) as DatabasePost[];

        const rows = allRows.filter(
          (row) => !blockedAccountIds.has(row.user_id)
        );

        const postIds = rows.map((row) => Number(row.id));

        let likeCounts: Record<number, number> = {};

        if (postIds.length > 0) {
          const { data: likeRows, error: likeError } = await supabase
            .from("post_likes")
            .select("post_id")
            .in("post_id", postIds);

          if (likeError) throw likeError;

          likeCounts = countLikes((likeRows ?? []) as DatabaseLike[]);
        }

        if (!active) return;

        const loadedPosts = rows.map((row) => ({
          ...mapDatabasePost(row),
          likes: likeCounts[Number(row.id)] ?? 0,
        }));

        postsRef.current = loadedPosts;
        setPosts(loadedPosts);

        if (postIds.length === 0) {
          setPostComments({});
          return;
        }

        const { data: commentRows, error: commentError } =
          await supabase
            .from("post_comments")
            .select(
              "id, post_id, content, author, username, created_at"
            )
            .in("post_id", postIds)
            .order("created_at", { ascending: true });

        if (commentError) throw commentError;
        if (!active) return;

        const grouped: Record<number, PostComment[]> = {};
        const commentCounts: Record<number, number> = {};

        for (const comment of (commentRows ??
          []) as DatabaseComment[]) {
          const postId = Number(comment.post_id);
          const commentTime = formatPostTime(comment.created_at);
          commentCounts[postId] = (commentCounts[postId] ?? 0) + 1;

          if (!grouped[postId]) {
            grouped[postId] = [];
          }

          grouped[postId].push({
            author:
              comment.author?.trim() ||
              comment.username?.trim().replace(/^@/, "") ||
              "VYBE user",
            username: comment.username?.trim() || "",
            content: commentTime
              ? `${comment.content} · ${commentTime}`
              : comment.content,
          });
        }

        setPostComments(grouped);
        setPosts((current) => {
          const updatedPosts = current.map((post) => ({
            ...post,
            comments: commentCounts[post.id] ?? 0,
          }));

          postsRef.current = updatedPosts;

          return updatedPosts;
        });
      } catch (error) {
        console.error("Could not load online posts:", error);

        if (active) {
          postsRef.current = [];
          setPosts([]);
          setPostComments({});
        }
      } finally {
        if (active) setIsLoaded(true);
      }
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  const refreshLikeCounts = useCallback(async () => {
    const supabase = createClient();
    const postIds = postsRef.current.map((post) => post.id);

    if (postIds.length === 0) return;

    const { data, error } = await supabase
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);

    if (error) {
      console.error("Could not refresh like counts:", error);
      return;
    }

    const counts = countLikes((data ?? []) as DatabaseLike[]);

    setPosts((current) => {
      const updatedPosts = current.map((post) => ({
        ...post,
        likes: counts[post.id] ?? 0,
      }));

      postsRef.current = updatedPosts;

      return updatedPosts;
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || posts.length === 0) return;

    let active = true;
    let refreshing = false;

    const refresh = async () => {
      if (refreshing || !active) return;

      refreshing = true;

      try {
        await refreshLikeCounts();
      } finally {
        refreshing = false;
      }
    };

    const interval = window.setInterval(() => {
      void refresh();
    }, 5000);

    const handleFocus = () => {
      void refresh();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [isLoaded, posts.length, refreshLikeCounts]);

  async function addPost(
    content: string,
    world: string,
    mediaFile?: File | File[],
    clubSlug?: string
  ) {
    const cleanContent = content.trim();

    const mediaFiles = mediaFile
      ? Array.isArray(mediaFile)
        ? mediaFile
        : [mediaFile]
      : [];

    if (!cleanContent && mediaFiles.length === 0) return;

    if (mediaFiles.length > 1) {
      const allImages = mediaFiles.every((file) =>
        file.type.startsWith("image/")
      );

      if (!allImages) {
        throw new Error(
          "Choose multiple pictures or one video per post. Pictures and videos cannot be mixed."
        );
      }
    }

    for (const file of mediaFiles) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        throw new Error("Please choose valid image or video files.");
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error(
          `"${file.name}" is larger than 50 MB. Please choose a smaller file.`
        );
      }
    }

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      throw new Error("Please log in before publishing a post.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const rawUsername =
      profile?.username?.trim() ||
      user.email?.split("@")[0] ||
      "user";

    const username = `@${rawUsername.replace(/^@/, "")}`;
    const author =
      profile?.display_name?.trim() ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      profile?.username?.trim() ||
      user.email?.split("@")[0] ||
      "VYBE user";

    const uploadedMedia: UploadedMedia[] = [];

    try {
      for (let index = 0; index < mediaFiles.length; index += 1) {
        const file = mediaFiles[index];
        const isVideo = file.type.startsWith("video/");

        const safeName = file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

        const storagePath = `${user.id}/${Date.now()}-${index}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(storagePath, file, {
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        uploadedMedia.push({
          storagePath,
          media: {
            mediaId: `post-media/${storagePath}`,
            mediaType: isVideo ? "video" : "image",
            mediaName: file.name,
          },
        });
      }

      const mediaItems = uploadedMedia.map((item) => item.media);
      const firstMedia = mediaItems[0];

      const normalizedClubSlug = clubSlug?.trim() || null;

      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          author,
          username,
          content: cleanContent,
          world,
          media_path: firstMedia?.mediaId ?? null,
          media_type: firstMedia?.mediaType ?? null,
          media_name: firstMedia?.mediaName ?? null,
          media_items: mediaItems,
          club_slug: normalizedClubSlug,
        })
        .select(
          "id, user_id, author, username, content, world, likes, comments, media_path, media_type, media_name, media_items, club_slug, created_at"
        )
        .single();

      if (error) throw error;

      const newPost = mapDatabasePost(data as DatabasePost);

      setPosts((current) => {
        const updatedPosts = [
          { ...newPost, likes: 0 },
          ...current.filter((post) => post.id !== newPost.id),
        ];

        postsRef.current = updatedPosts;

        return updatedPosts;
      });
    } catch (error) {
      if (uploadedMedia.length > 0) {
        const pathsToRemove = uploadedMedia.map(
          (item) => item.storagePath
        );

        const { error: cleanupError } = await supabase.storage
          .from("post-media")
          .remove(pathsToRemove);

        if (cleanupError) {
          console.error(
            "Could not clean up uploaded post media:",
            cleanupError
          );
        }
      }

      throw error;
    }
  }

  async function deletePost(postId: number) {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      throw new Error("Please log in before deleting a post.");
    }

    // Retrieve the post only if the signed-in user owns it.
    const { data: postData, error: fetchError } = await supabase
      .from("posts")
      .select("id, user_id, media_path, media_items")
      .eq("id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Could not verify post ownership:", fetchError);
      throw fetchError;
    }

    if (!postData) {
      throw new Error(
        "You can only delete a post that belongs to your account."
      );
    }

    // Delete the database post first. The posts table's RLS policy
    // must also restrict deletion to the post owner.
    const { data: deletedRows, error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", user.id)
      .select("id");

    if (deleteError) {
      console.error("Could not delete post:", deleteError);
      throw deleteError;
    }

    if (!deletedRows || deletedRows.length === 0) {
      throw new Error(
        "The post was not deleted. Please check your database permissions."
      );
    }

    // Remove it from the UI immediately after Supabase confirms deletion.
    setPosts((current) => {
      const updatedPosts = current.filter((post) => post.id !== postId);
      postsRef.current = updatedPosts;
      return updatedPosts;
    });

    setPostComments((current) => {
      const updatedComments = { ...current };
      delete updatedComments[postId];
      return updatedComments;
    });

    // Clean up uploaded images/videos where possible. A storage cleanup
    // failure must not undo the successful database deletion.
    const mediaPaths = new Set<string>();

    const legacyPath = getStoragePath(postData.media_path);

    if (legacyPath) {
      mediaPaths.add(legacyPath);
    }

    const mediaItems = Array.isArray(postData.media_items)
      ? postData.media_items.filter(isValidPostMedia)
      : [];

    for (const item of mediaItems) {
      const path = getStoragePath(item.mediaId);
      if (path) mediaPaths.add(path);
    }

    if (mediaPaths.size > 0) {
      const { error: storageError } = await supabase.storage
        .from("post-media")
        .remove(Array.from(mediaPaths));

      if (storageError) {
        console.error(
          "Post deleted, but its media files could not be cleaned up:",
          storageError
        );
      }
    }

    window.dispatchEvent(new Event("project-one-posts-updated"));
  }

  async function likePost(postId: number) {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      throw new Error("Please log in to like a post.");
    }

    const { error } = await supabase.from("post_likes").insert({
      post_id: postId,
      user_id: user.id,
    });

    if (error && error.code !== "23505") {
      console.error("Could not like post:", error);
      throw error;
    }

    await refreshLikeCounts();

    window.dispatchEvent(new Event("project-one-likes-updated"));
  }

  async function unlikePost(postId: number) {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      throw new Error("Please log in to unlike a post.");
    }

    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Could not unlike post:", error);
      throw error;
    }

    await refreshLikeCounts();

    window.dispatchEvent(new Event("project-one-likes-updated"));
  }

  async function addComment(postId: number, comment: string) {
    const cleanComment = comment.trim();

    if (!cleanComment) return;

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Could not load comment profile:", profileError);
      throw profileError;
    }

    const rawUsername =
      profile?.username?.trim() ||
      user.email?.split("@")[0] ||
      "user";

    const username = `@${rawUsername.replace(/^@/, "")}`;
    const author =
      profile?.display_name?.trim() ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      profile?.username?.trim() ||
      user.email?.split("@")[0] ||
      "VYBE user";

    const { data: insertedComment, error: insertError } =
      await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          author,
          username,
          content: cleanComment,
        })
        .select("created_at")
        .single();

    if (insertError) {
      console.error("Could not add comment:", insertError);
      throw insertError;
    }

    const { count, error: countError } = await supabase
      .from("post_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    if (countError) {
      console.error("Could not count comments:", countError);
      throw countError;
    }

    const commentTime = insertedComment?.created_at
      ? formatPostTime(insertedComment.created_at)
      : "Just now";

    setPostComments((current) => ({
      ...current,
      [postId]: [
        ...(current[postId] || []),
        {
          author,
          username,
          content: commentTime
            ? `${cleanComment} · ${commentTime}`
            : cleanComment,
        },
      ],
    }));

    setPosts((current) => {
      const updatedPosts = current.map((post) =>
        post.id === postId
          ? { ...post, comments: count ?? post.comments + 1 }
          : post
      );

      postsRef.current = updatedPosts;

      return updatedPosts;
    });
  }

  if (!isLoaded) {
    return (
      <div
        className="min-h-screen bg-white"
        aria-label="Loading posts"
      />
    );
  }

  return (
    <PostContext.Provider
      value={{
        posts,
        postComments,
        addPost,
        deletePost,
        likePost,
        unlikePost,
        addComment,
      }}
    >
      {children}
    </PostContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostContext);

  if (context === null) {
    throw new Error("usePosts must be used inside PostProvider");
  }

  return context;
}
