
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../utils/supabase/client";
import { usePosts } from "../PostContext";
import MediaDisplay from "../MediaDisplay";

export default function SavedPage() {
  const { posts } = usePosts();

  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadSavedPosts = useCallback(async () => {
    setLoading(true);
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
        setSavedIds([]);
        setError("Please log in to view your saved collection.");
        return;
      }

      const { data, error: savedError } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (savedError) {
        throw savedError;
      }

      const ids = (data ?? [])
        .map((item: { post_id: number | string }) => Number(item.post_id))
        .filter((id: number) => Number.isFinite(id));

      setSavedIds(ids);
    } catch (err) {
      console.error("Could not load saved posts:", err);
      setError("We couldn't load your saved posts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadSavedPosts(),
      0
    );

    return () => window.clearTimeout(initialLoad);
  }, [loadSavedPosts]);

  useEffect(() => {
    const handleSavedPostsUpdated = () => {
      void loadSavedPosts();
    };

    window.addEventListener(
      "project-one-saved-posts-updated",
      handleSavedPostsUpdated
    );

    return () => {
      window.removeEventListener(
        "project-one-saved-posts-updated",
        handleSavedPostsUpdated
      );
    };
  }, [loadSavedPosts]);

  const savedPosts = useMemo(() => {
    const postById = new Map(
      posts.map((post) => [Number(post.id), post] as const)
    );

    return savedIds
      .map((id) => postById.get(id))
      .filter((post) => post !== undefined);
  }, [savedIds, posts]);

  const removeSavedPost = async (postId: number) => {
    setRemovingId(postId);
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
        setError("Please log in to manage your saved posts.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("saved_posts")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);

      if (deleteError) {
        throw deleteError;
      }

      setSavedIds((current) =>
        current.filter((id) => id !== postId)
      );

      window.dispatchEvent(
        new CustomEvent("project-one-saved-posts-updated")
      );
    } catch (err) {
      console.error("Could not remove saved post:", err);
      setError("We couldn't remove this post. Please try again.");
    } finally {
      setRemovingId(null);
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

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Saved
            </h1>
            <p className="text-sm text-gray-500">
              Your personal collection
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            {savedIds.length}
          </span>
        </header>

        {error && (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={() => void loadSavedPosts()}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
            <p className="mt-4 text-sm text-gray-500">
              Loading your collection...
            </p>
          </div>
        ) : savedIds.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-200">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              Your collection is empty
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
              Save posts you love and want to revisit. They will appear here.
            </p>

            <Link
              href="/app"
              className="mt-6 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50"
            >
              Explore your feed
            </Link>
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-600">
              Your saved posts are recorded, but they aren&apos;t available in
              the currently loaded feed.
            </p>
            <button
              type="button"
              onClick={() => void loadSavedPosts()}
              className="mt-4 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Refresh collection
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {savedPosts.map((post) => (
              <article
                key={post.id}
                className="px-4 py-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {post.author || "User"}
                    </p>

                    {post.username && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        @{post.username.replace(/^@/, "")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeSavedPost(Number(post.id))}
                    disabled={removingId === Number(post.id)}
                    className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removingId === Number(post.id)
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </div>

                {post.content && (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                    {post.content}
                  </p>
                )}

                {post.mediaId && (
                  <div className="mt-3 overflow-hidden rounded-xl">
                    <MediaDisplay
                      mediaId={post.mediaId}
                      mediaType={post.mediaType}
                      mediaName={post.mediaName}
                    />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {post.world && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1">
                      {post.world}
                    </span>
                  )}

                  {post.time && <span>{post.time}</span>}
                </div>

                <Link
                  href={`/app?post=${post.id}`}
                  className="mt-4 inline-flex text-sm font-medium text-gray-600 underline underline-offset-4 hover:text-black"
                >
                  View post in feed
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
