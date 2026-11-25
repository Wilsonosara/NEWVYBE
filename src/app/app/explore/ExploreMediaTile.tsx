"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "../../../../utils/supabase/client";
import { getMedia } from "../../lib/mediaStorage";
import { usePosts, type PostComment } from "../PostContext";
import MediaDisplay, { lockPageScroll } from "../MediaDisplay";
import type { Post, PostMedia } from "../../lib/posts";

function publicMediaUrl(mediaId: string) {
  if (!mediaId.startsWith("post-media/")) return "";
  const storagePath = mediaId.slice("post-media/".length);
  return createClient().storage.from("post-media").getPublicUrl(storagePath).data.publicUrl;
}

async function resolveMediaUrl(mediaId?: string) {
  if (!mediaId) return "";
  const publicUrl = publicMediaUrl(mediaId);
  if (publicUrl) return publicUrl;
  const blob = await getMedia(mediaId);
  return blob ? URL.createObjectURL(blob) : "";
}

type ExploreItem = { post: Post; media: PostMedia | null };

function ExplorePostSlide({ item, onClose, onNavigate, onComments, wheelNavigationGuard }: { item: ExploreItem; onClose: () => void; onNavigate: (direction: "next" | "previous") => void; onComments: () => void; wheelNavigationGuard: { current: { x: number; y: number; triggered: boolean; resetTimer: number | null } } }) {
  const { likePost, unlikePost, postComments } = usePosts();
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(item.post.likes);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    const loadLikeState = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [likeResult, dislikeResult, savedResult, countResult] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("post_id", item.post.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("post_dislikes").select("post_id").eq("post_id", item.post.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("saved_posts").select("post_id").eq("post_id", item.post.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("post_dislikes").select("post_id", { count: "exact", head: true }).eq("post_id", item.post.id),
      ]);
      if (!active) return;
      if (!likeResult.error) setLiked(Boolean(likeResult.data));
      if (!dislikeResult.error) setDisliked(Boolean(dislikeResult.data));
      if (!savedResult.error) setSaved(Boolean(savedResult.data));
      if (!countResult.error) setDislikeCount(countResult.count ?? 0);
    };
    void loadLikeState();
    return () => { active = false; };
  }, [item.post.id]);

  const toggleLike = async () => {
    if (likeBusy) return;
    const nextLiked = !liked;
    setLikeBusy(true);
    setActionError("");
    setLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));
    try {
      if (nextLiked) await likePost(item.post.id);
      else await unlikePost(item.post.id);
    } catch (error) {
      setLiked(!nextLiked);
      setLikeCount((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
      setActionError(error instanceof Error ? error.message : "Could not update your like. Please try again.");
    } finally {
      setLikeBusy(false);
    }
  };


  const toggleDislike = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to react to posts.");
      if (disliked) {
        const { error } = await supabase.from("post_dislikes").delete().eq("user_id", user.id).eq("post_id", item.post.id);
        if (error) throw error;
        setDisliked(false); setDislikeCount((count) => Math.max(0, count - 1));
      } else {
        if (liked) { await unlikePost(item.post.id); setLiked(false); setLikeCount((count) => Math.max(0, count - 1)); }
        const { error } = await supabase.from("post_dislikes").upsert({ user_id: user.id, post_id: item.post.id }, { onConflict: "user_id,post_id", ignoreDuplicates: true });
        if (error) throw error;
        setDisliked(true); setDislikeCount((count) => count + 1);
      }
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not update your reaction."); }
  };

  const toggleSave = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to save posts.");
      if (saved) {
        const { error } = await supabase.from("saved_posts").delete().eq("user_id", user.id).eq("post_id", item.post.id);
        if (error) throw error;
        setSaved(false);
      } else {
        const { error } = await supabase.from("saved_posts").upsert({ user_id: user.id, post_id: item.post.id }, { onConflict: "user_id,post_id", ignoreDuplicates: true });
        if (error) throw error;
        setSaved(true);
      }
      window.dispatchEvent(new Event("project-one-saved-posts-updated"));
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not save this post."); }
  };

  const sharePost = async () => {
    const url = `${window.location.origin}/app?post=${item.post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `Post by ${item.post.author}`, url });
      else { await navigator.clipboard.writeText(url); setActionError("Post link copied."); }
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setActionError("Could not share this post."); }
  };

  const viewerMedia = item.post.mediaItems?.length
    ? item.media ? [item.media, ...item.post.mediaItems.filter((candidate) => candidate.mediaId !== item.media?.mediaId)] : item.post.mediaItems
    : item.media ? [item.media] : [];

  return <><MediaDisplay mediaId={viewerMedia[0]?.mediaId} mediaType={viewerMedia[0]?.mediaType} mediaName={viewerMedia[0]?.mediaName} mediaItems={viewerMedia} isViewerOpen wheelNavigationGuard={wheelNavigationGuard} onCloseViewer={onClose} onNavigate={onNavigate} authorName={item.post.author} authorUsername={item.post.username} authorProfileUrl={item.post.username ? `/app/profile?username=${encodeURIComponent(item.post.username.replace(/^@/, ""))}` : item.post.authorId ? `/app/profile?id=${encodeURIComponent(item.post.authorId)}` : "/app/profile"} postContent={item.post.content} likesCount={likeCount} dislikesCount={dislikeCount} commentsCount={postComments[item.post.id]?.length || item.post.comments} isLiked={liked} isDisliked={disliked} isSaved={saved} onLike={() => void toggleLike()} onDislike={() => void toggleDislike()} onComments={onComments} onSave={() => void toggleSave()} onShare={() => void sharePost()} />{actionError && <div role="alert" className="fixed bottom-5 left-1/2 z-[150] -translate-x-1/2 rounded-xl bg-black/80 px-4 py-2 text-sm text-white">{actionError}</div>}</>;
}

function ExploreCommentsPanel({ item, onClose }: { item: ExploreItem; onClose: () => void }) {
  const { addComment, postComments, toggleCommentLike, deleteComment } = usePosts();
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [pendingLikeId, setPendingLikeId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const comments = postComments[item.post.id] ?? [];
  useEffect(() => {
    const unlock = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { unlock(); window.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);
  useEffect(() => {
    let active = true;
    void createClient().auth.getUser().then(({ data: { user } }) => { if (active) setCurrentUserId(user?.id ?? null); });
    return () => { active = false; };
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commentText.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) throw new Error("Please log in to comment.");
      await addComment(item.post.id, commentText.trim(), undefined, replyTo?.id ?? null);
      setCommentText("");
      setReplyTo(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not post your comment."); }
    finally { setBusy(false); }
  };
  const handleLike = async (comment: PostComment) => {
    if (pendingLikeId !== null) return;
    setPendingLikeId(comment.id); setError("");
    try { await toggleCommentLike(item.post.id, comment.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update comment like."); }
    finally { setPendingLikeId(null); }
  };
  const handleDelete = async (comment: PostComment) => {
    if (deletingId !== null || !window.confirm("Delete your comment? This cannot be undone.")) return;
    setDeletingId(comment.id); setError("");
    try { await deleteComment(item.post.id, comment.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete your comment."); }
    finally { setDeletingId(null); }
  };
  const renderComment = (comment: PostComment, depth = 0) => {
    const replies = comments.filter((entry) => entry.parentCommentId === comment.id);
    return <div key={`${item.post.id}-${comment.id}`} className="flex gap-2.5" style={{ marginLeft: `${Math.min(depth * 24, 48)}px` }}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500"><span className="text-xs font-bold">{comment.author.slice(0, 1).toUpperCase()}</span></div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-gray-100 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2">{comment.userId ? <Link href={`/app/profile?id=${encodeURIComponent(comment.userId)}`} className="text-sm font-bold text-gray-950 hover:underline">{comment.author}</Link> : <span className="text-sm font-bold text-gray-950">{comment.author}</span>}{comment.username && <span className="text-xs text-gray-500">{comment.username}</span>}<span className="text-xs text-gray-400">· {comment.createdAt}</span></div>
          {comment.content && <p className="mt-1 break-words text-sm text-gray-800">{comment.content}</p>}
          {comment.audioUrl && <audio controls preload="none" src={comment.audioUrl} className="mt-2 block h-10 max-w-full" aria-label={`Voice comment by ${comment.username || comment.author}`} />}
        </div>
        <div className="mt-1 flex items-center gap-4 px-2 text-xs font-semibold text-gray-500">
          <button type="button" onClick={() => void handleLike(comment)} disabled={pendingLikeId === comment.id} className={comment.likedByMe ? "text-rose-600" : "hover:text-gray-900"}>{comment.likedByMe ? "♥" : "♡"} {comment.likes > 0 ? comment.likes : "Like"}</button>
          <button type="button" onClick={() => { setReplyTo(comment); setExpandedReplies((current) => new Set(current).add(comment.id)); }} className="hover:text-gray-900">Reply {replies.length}</button>
          {comment.userId === currentUserId && <button type="button" onClick={() => void handleDelete(comment)} disabled={deletingId !== null} className="hover:text-gray-900 disabled:opacity-50">{deletingId === comment.id ? "Deleting…" : "Delete"}</button>}
        </div>
        {expandedReplies.has(comment.id) && replies.map((reply) => renderComment(reply, depth + 1))}
      </div>
    </div>;
  };
  return <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label="Post comments" className="flex h-[86dvh] max-h-[760px] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[min(760px,85vh)] sm:rounded-3xl">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4"><div className="min-w-0"><h2 className="text-base font-bold text-gray-950">Comments</h2><p className="mt-0.5 truncate text-xs text-gray-500">{item.post.author} · {item.post.content}</p></div><button type="button" onClick={onClose} aria-label="Close comments" className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100">×</button></header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"><div className="space-y-4">{comments.filter((comment) => !comment.parentCommentId).map((comment) => renderComment(comment))}{comments.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Be the first to comment.</p>}</div>{error && <p className="mt-3 text-xs text-red-600" role="alert">{error}</p>}</div>
      <form className="relative flex shrink-0 items-center gap-2 border-t border-gray-100 bg-white px-3 py-3 sm:px-4" onSubmit={(event) => { event.preventDefault(); void submit(event); }}>
        {replyTo && <div className="absolute bottom-full left-4 mb-1 flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"><span>Replying to {replyTo.author}</span><button type="button" onClick={() => setReplyTo(null)} className="font-bold hover:text-gray-950" aria-label="Cancel reply">×</button></div>}
        <input type="text" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder={replyTo ? `Reply to ${replyTo.author}...` : "Add a comment…"} aria-label={replyTo ? `Reply to ${replyTo.author}` : "Add a comment"} className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-400" />
        <button type="submit" disabled={!commentText.trim() || busy} className="rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Posting…" : "Post"}</button>
      </form>
    </section>
  </div>;
}

export default function ExploreMediaTile({ post, media, allPosts = [] }: { post: Post; media: PostMedia | null; allPosts?: ExploreItem[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [viewerPostId, setViewerPostId] = useState<number | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<number | null>(null);
  const wheelNavigationGuard = useRef({ x: 0, y: 0, triggered: false, resetTimer: null as number | null });

  useEffect(() => {
    let active = true;
    let objectUrls: string[] = [];
    const load = async () => {
      try {
        const [nextMediaUrl, nextPosterUrl] = await Promise.all([
          resolveMediaUrl(media?.mediaId),
          resolveMediaUrl(media?.thumbnailId),
        ]);
        if (!active) {
          for (const url of [nextMediaUrl, nextPosterUrl]) if (url.startsWith("blob:")) URL.revokeObjectURL(url);
          return;
        }
        objectUrls = [nextMediaUrl, nextPosterUrl].filter((url) => url.startsWith("blob:"));
        setMediaUrl(nextMediaUrl);
        setPosterUrl(nextPosterUrl);
      } catch (error) {
        console.error("Could not load Explore media:", error);
      }
    };
    void load();
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [media?.mediaId, media?.thumbnailId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) return;
    if (isOpen) {
      video.pause();
      return;
    }
    video.muted = true;
    if (typeof IntersectionObserver === "undefined") {
      void video.play().catch(() => undefined);
      return () => video.pause();
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && entry.intersectionRatio >= 0.35 && document.visibilityState === "visible") {
        video.muted = true;
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }, { threshold: [0, 0.35, 0.65, 1] });
    observer.observe(video);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") video.pause();
      else {
        const bounds = video.getBoundingClientRect();
        const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
        if (visibleHeight / Math.max(bounds.height, 1) >= 0.35) void video.play().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      video.pause();
    };
  }, [mediaUrl, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    videoRef.current?.pause();
    const unlockPageScroll = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      unlockPageScroll();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const viewerPosts = allPosts.length ? allPosts : [{ post, media }];
  const currentViewerIndex = viewerPostId === null ? -1 : viewerPosts.findIndex((item) => item.post.id === viewerPostId);
  const currentViewerItem = viewerPosts.find((item) => item.post.id === viewerPostId) ?? (isOpen ? { post, media } : null);
  const commentsItem = commentsPostId === null ? null : viewerPosts.find((item) => item.post.id === commentsPostId) ?? null;
  const navigateViewer = (direction: "next" | "previous") => {
    const currentIndex = currentViewerIndex >= 0 ? currentViewerIndex : viewerPosts.findIndex((item) => item.post.id === post.id);
    const nextIndex = Math.max(0, Math.min(viewerPosts.length - 1, currentIndex + (direction === "next" ? 1 : -1)));
    if (nextIndex === currentIndex) return;
    setViewerPostId(viewerPosts[nextIndex].post.id);
  };

  return (
    <>
    <button
      type="button"
      onClick={() => { setViewerPostId(post.id); setIsOpen(true); }}
      aria-label={`View post by ${post.author}`}
      className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-gray-100 text-left"
    >
      {media?.mediaType === "video" ? (
        <video ref={videoRef} src={mediaUrl || undefined} poster={posterUrl || undefined} muted loop playsInline preload="metadata" aria-label={media.mediaName || "Explore video"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : media && mediaUrl ? (
        <img src={mediaUrl} alt={media.mediaName || "Explore post"} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-200 via-rose-100 to-amber-100 p-3 text-center text-xs font-semibold text-gray-700 sm:p-5 sm:text-sm">
          <span>{post.world || "VYBE post"}</span>
        </div>
      )}
      {media?.mediaType === "video" && <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm" aria-label="Video"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="m8 5 12 7-12 7z" /></svg></span>}
    </button>
    {isOpen && currentViewerItem && <ExplorePostSlide key={currentViewerItem.post.id} item={currentViewerItem} onClose={() => setIsOpen(false)} onNavigate={navigateViewer} onComments={() => { setCommentsPostId(currentViewerItem.post.id); setIsOpen(false); }} wheelNavigationGuard={wheelNavigationGuard} />}
    {commentsItem && <ExploreCommentsPanel item={commentsItem} onClose={() => setCommentsPostId(null)} />}
    </>
  );
}
