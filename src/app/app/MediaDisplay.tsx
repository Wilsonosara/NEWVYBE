"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { getMedia } from "../lib/mediaStorage";
import type { PostMedia } from "../lib/posts";

let activeViewerScrollLocks = 0;
let bodyOverflowBeforeViewer = "";

function lockPageScroll() {
  if (activeViewerScrollLocks === 0) {
    bodyOverflowBeforeViewer = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  activeViewerScrollLocks += 1;

  return () => {
    activeViewerScrollLocks = Math.max(0, activeViewerScrollLocks - 1);

    if (activeViewerScrollLocks === 0) {
      document.body.style.overflow = bodyOverflowBeforeViewer;
      bodyOverflowBeforeViewer = "";
    }
  };
}

type MediaDisplayProps = {
  mediaId?: string;
  mediaType?: "image" | "video";
  mediaName?: string;
  mediaItems?: PostMedia[];
  isViewerOpen?: boolean;
  isViewerTransitionIncoming?: boolean;
  isViewerTransitionOutgoing?: boolean;
  isViewerTransitioning?: boolean;
  viewerDirection?: "next" | "previous" | null;
  onOpenViewer?: () => void;
  onCloseViewer?: () => void;
  onNavigate?: (direction: "next" | "previous") => void;
  authorName?: string;
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  authorProfileUrl?: string;
  postContent?: string;
  likesCount?: number;
  dislikesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isPoppingLike?: boolean;
  isDisliked?: boolean;
  isSaved?: boolean;
  isFollowingAuthor?: boolean;
  isFollowPending?: boolean;
  onLike?: () => void;
  onDislike?: () => void;
  onFollow?: () => void;
  onComments?: () => void;
  onSave?: () => void;
  onShare?: () => void;
};

export default function MediaDisplay({
  mediaId,
  mediaType,
  mediaName,
  mediaItems,
  isViewerOpen,
  isViewerTransitionIncoming = false,
  isViewerTransitionOutgoing = false,
  isViewerTransitioning = false,
  viewerDirection = null,
  onOpenViewer,
  onCloseViewer,
  onNavigate,
  authorName = "VYBE member",
  authorUsername = "",
  authorAvatarUrl,
  authorProfileUrl = "/app/profile",
  postContent = "",
  likesCount = 0,
  dislikesCount = 0,
  commentsCount = 0,
  isLiked = false,
  isPoppingLike = false,
  isDisliked = false,
  isSaved = false,
  isFollowingAuthor = false,
  isFollowPending = false,
  onLike,
  onDislike,
  onFollow,
  onComments,
  onSave,
  onShare,
}: MediaDisplayProps) {
  const [mediaUrl, setMediaUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [localViewerOpen, setLocalViewerOpen] = useState(false);
  const isFullscreen = isViewerOpen ?? localViewerOpen;
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [mediaSwipeDirection, setMediaSwipeDirection] = useState<"left" | "right" | null>(null);
  const mediaSwipeTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const previewTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const previewSwipeHandledRef = useRef(false);
  const viewerSwipeHandledRef = useRef(false);
  const ignorePreviewClickRef = useRef(false);
  const navigationTriggeredRef = useRef(false);
  const allMedia: PostMedia[] = mediaItems?.length
    ? mediaItems
    : mediaId && mediaType
      ? [{ mediaId, mediaType, mediaName: mediaName || "Post media" }]
      : [];
  const visibleMediaIndex = Math.min(mediaIndex, Math.max(0, allMedia.length - 1));
  const activeMedia = allMedia[visibleMediaIndex];
  const activeMediaId = activeMedia?.mediaId;
  const activeMediaType = activeMedia?.mediaType;
  const activeMediaName = activeMedia?.mediaName;
  const hasMedia = Boolean(activeMediaId && activeMediaType);
  const hasCarousel = allMedia.length > 1;

  const moveMedia = useCallback((direction: "next" | "previous") => {
    if (direction === "next" && visibleMediaIndex >= allMedia.length - 1) return;
    if (direction === "previous" && visibleMediaIndex <= 0) return;
    setMediaSwipeDirection(direction === "next" ? "left" : "right");
    setMediaIndex(direction === "next" ? visibleMediaIndex + 1 : visibleMediaIndex - 1);
    if (mediaSwipeTimerRef.current !== null) window.clearTimeout(mediaSwipeTimerRef.current);
    mediaSwipeTimerRef.current = window.setTimeout(() => setMediaSwipeDirection(null), 260);
  }, [allMedia.length, visibleMediaIndex]);

  useEffect(() => () => {
    if (mediaSwipeTimerRef.current !== null) window.clearTimeout(mediaSwipeTimerRef.current);
  }, []);

  const mediaSwipeClass = mediaSwipeDirection === "left"
    ? "vybe-carousel-slide-left"
    : mediaSwipeDirection === "right"
      ? "vybe-carousel-slide-right"
      : "";

  const openViewerFromPreview = (event: { stopPropagation: () => void }) => {
    if (ignorePreviewClickRef.current) {
      event.stopPropagation();
      ignorePreviewClickRef.current = false;
      return;
    }
    openViewer();
  };

  const handlePreviewTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = previewTouchStartRef.current;
    const touch = event.changedTouches[0];
    previewTouchStartRef.current = null;
    if (previewSwipeHandledRef.current) {
      previewSwipeHandledRef.current = false;
      return;
    }
    if (!start || !touch || !hasCarousel) return;
    const dx = start.x - touch.clientX;
    const dy = start.y - touch.clientY;
    if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 35) return;
    moveMedia(dx > 0 ? "next" : "previous");
    ignorePreviewClickRef.current = true;
    window.setTimeout(() => { ignorePreviewClickRef.current = false; }, 450);
  };

  const handlePreviewTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = previewTouchStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch || !hasCarousel || previewSwipeHandledRef.current) return;
    const dx = start.x - touch.clientX;
    const dy = start.y - touch.clientY;
    if (Math.abs(dx) < 35 || Math.abs(dx) <= Math.abs(dy)) return;
    event.preventDefault();
    moveMedia(dx > 0 ? "next" : "previous");
    previewSwipeHandledRef.current = true;
    ignorePreviewClickRef.current = true;
    window.setTimeout(() => { ignorePreviewClickRef.current = false; }, 450);
  };

  const handleViewerTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch || viewerSwipeHandledRef.current || isViewerTransitioning) return;
    const dx = start.x - touch.clientX;
    const dy = start.y - touch.clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= 35) {
      event.preventDefault();
      moveByGesture(dx > 0 ? "next" : "previous");
      viewerSwipeHandledRef.current = true;
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) >= 45 && onNavigate) {
      event.preventDefault();
      navigateToPost(dy > 0 ? "next" : "previous");
      viewerSwipeHandledRef.current = true;
    }
  };

  const openViewer = useCallback(() => {
    setShowMoreMenu(false);
    if (onOpenViewer) onOpenViewer();
    else setLocalViewerOpen(true);
  }, [onOpenViewer]);

  const closeViewer = useCallback(() => {
    setShowMoreMenu(false);
    if (onCloseViewer) onCloseViewer();
    else setLocalViewerOpen(false);
  }, [onCloseViewer]);

  const navigateToPost = useCallback((direction: "next" | "previous") => {
    if (!onNavigate) return;
    if (isViewerTransitioning) return;
    if (navigationTriggeredRef.current) return;
    navigationTriggeredRef.current = true;
    if (isViewerOpen === undefined) closeViewer();
    onNavigate(direction);
    window.setTimeout(() => {
      navigationTriggeredRef.current = false;
    }, 350);
  }, [closeViewer, isViewerOpen, isViewerTransitioning, onNavigate]);

  const moveByGesture = useCallback((direction: "next" | "previous") => {
    const canMoveMedia = direction === "next"
      ? visibleMediaIndex < allMedia.length - 1
      : visibleMediaIndex > 0;
    if (canMoveMedia) {
      moveMedia(direction);
    } else if (isFullscreen && onNavigate) {
      navigateToPost(direction);
    }
  }, [allMedia.length, isFullscreen, moveMedia, navigateToPost, onNavigate, visibleMediaIndex]);

  const stopViewerClick = (event: { stopPropagation: () => void }) =>
    event.stopPropagation();

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const resetState = () => {
      setMediaUrl("");
      setFailed(false);
    };

    if (!activeMediaId || !activeMediaType) {
      const resetTimeout = window.setTimeout(resetState, 0);

      return () => {
        active = false;
        window.clearTimeout(resetTimeout);
      };
    }

    const currentMediaId: string = activeMediaId;

    async function loadMedia() {
      try {
        if (currentMediaId.startsWith("post-media/")) {
          const supabase = createClient();
          const storagePath = currentMediaId.slice(
            "post-media/".length
          );

          const { data } = supabase.storage
            .from("post-media")
            .getPublicUrl(storagePath);

          if (!data.publicUrl) {
            throw new Error("Could not get the media URL from Supabase.");
          }

          if (active) {
            setMediaUrl(data.publicUrl);
          }

          return;
        }

        // Support older media saved in this browser.
        const blob = await getMedia(currentMediaId);

        if (!active) return;

        if (!blob) {
          throw new Error("Media was not found in browser storage.");
        }

        objectUrl = URL.createObjectURL(blob);
        setMediaUrl(objectUrl);
      } catch (error) {
        console.error("Could not load post media:", error);

        if (active) {
          setFailed(true);
        }
      }
    }

    const loadTimeout = window.setTimeout(() => {
      resetState();
      void loadMedia();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(loadTimeout);

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activeMediaId, activeMediaType]);

  useEffect(() => {
    if (!isFullscreen) return;
    navigationTriggeredRef.current = false;
    const unlockPageScroll = lockPageScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeViewer();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        navigateToPost("next");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        navigateToPost("previous");
      } else if (event.key === "ArrowRight" && hasCarousel) {
        event.preventDefault();
        moveMedia("next");
      } else if (event.key === "ArrowLeft" && hasCarousel) {
        event.preventDefault();
        moveMedia("previous");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockPageScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeViewer, hasCarousel, isFullscreen, moveMedia, navigateToPost]);

  if (!hasMedia && !isFullscreen) {
    return null;
  }

  if (hasMedia && failed) {
    return (
      <p className="my-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
        This media could not be loaded. Please check the upload and storage
        settings.
      </p>
    );
  }

  if (hasMedia && !mediaUrl && !isFullscreen) {
    return (
      <div className="flex min-h-24 w-full items-center justify-center bg-gray-50 text-sm text-gray-400">
        Loading media...
      </div>
    );
  }

  return (
    <>
      {hasMedia && <>
      <div className={`relative mb-2 w-full touch-pan-y overflow-hidden bg-black sm:rounded-xl ${hasCarousel ? "aspect-[4/5] max-h-[85vh]" : ""}`} onTouchStart={(event) => { const touch = event.touches[0]; previewTouchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null; previewSwipeHandledRef.current = false; }} onTouchMove={handlePreviewTouchMove} onTouchEnd={handlePreviewTouchEnd}>
        {activeMediaType === "video" ? (
          <video
            key={activeMediaId}
            src={mediaUrl}
            controls
            playsInline
            preload="metadata"
            aria-label={activeMediaName || "Post video"}
            onClick={openViewerFromPreview}
            className={`block ${hasCarousel ? "h-full w-full object-contain" : "max-h-[85vh] w-full object-contain"} cursor-pointer ${mediaSwipeClass}`}
          />
        ) : (
          <button
            type="button"
            onClick={openViewerFromPreview}
            aria-label="Open image full screen"
            className={`block cursor-zoom-in bg-black p-0 ${hasCarousel ? "absolute inset-0 h-full w-full" : "w-full"}`}
          >
            <img
              key={activeMediaId}
              src={mediaUrl}
              alt={activeMediaName || "Post image"}
              loading="lazy"
              className={`block ${hasCarousel ? "h-full w-full object-contain" : "h-auto max-h-[85vh] w-full object-contain"} ${mediaSwipeClass}`}
            />
          </button>
        )}
      </div>
      {hasCarousel && <div className="flex items-center justify-center gap-1.5 pb-2" role="tablist" aria-label="Post media">
        {allMedia.map((item, index) => <button key={`${item.mediaId}-${index}`} type="button" role="tab" aria-label={`Show media ${index + 1} of ${allMedia.length}`} aria-selected={visibleMediaIndex === index} onClick={() => setMediaIndex(index)} className={`h-1.5 rounded-full transition-all ${visibleMediaIndex === index ? "w-3 bg-[#7d80e8]" : "w-1.5 bg-gray-300"}`} />)}
      </div>}
      </>}

      {isFullscreen && (
        <div
          className={`fixed inset-0 ${isViewerTransitionIncoming ? "z-[41]" : "z-40"} h-[100dvh] w-screen touch-pan-y overflow-hidden bg-black ${isViewerTransitionOutgoing ? "pointer-events-none" : ""} ${isViewerTransitionIncoming ? viewerDirection === "previous" ? "vybe-viewer-enter-down" : "vybe-viewer-enter-up" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Post viewer. Swipe left or right to view media, or up and down to move between posts."
          onClick={closeViewer}
          onWheel={(event) => {
            if (isViewerTransitioning) return;
            if (hasCarousel && Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) >= 30) {
              event.preventDefault();
              moveByGesture(event.deltaX > 0 ? "next" : "previous");
              return;
            }
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) >= 30 && isFullscreen && onNavigate) {
              event.preventDefault();
              moveByGesture(event.deltaX > 0 ? "next" : "previous");
              return;
            }
            if (Math.abs(event.deltaY) < 30 || !onNavigate) return;
            event.preventDefault();
            navigateToPost(event.deltaY > 0 ? "next" : "previous");
          }}
          onTouchStart={(event) => {
            if (isViewerTransitioning) return;
            const touch = event.touches[0];
            touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
            viewerSwipeHandledRef.current = false;
          }}
          onTouchMove={handleViewerTouchMove}
          onTouchEnd={(event) => {
            if (isViewerTransitioning) return;
            const start = touchStartRef.current;
            const touch = event.changedTouches[0];
            touchStartRef.current = null;
            if (viewerSwipeHandledRef.current) {
              viewerSwipeHandledRef.current = false;
              return;
            }
            if (!start || !touch) return;
            const distanceX = start.x - touch.clientX;
            const distanceY = start.y - touch.clientY;
            if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) >= 55 && hasCarousel) {
              moveByGesture(distanceX > 0 ? "next" : "previous");
              return;
            }
            if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) >= 55 && isFullscreen && onNavigate) {
              moveByGesture(distanceX > 0 ? "next" : "previous");
              return;
            }
            if (Math.abs(distanceY) < 55 || !onNavigate) return;
            navigateToPost(distanceY > 0 ? "next" : "previous");
          }}
        >
          {!hasMedia ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#161616] px-10 text-center text-2xl font-semibold leading-relaxed text-white sm:px-20">
              <p className="max-w-2xl">{postContent || "VYBE post"}</p>
            </div>
          ) : !mediaUrl ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#161616] text-sm text-white/70">Loading post…</div>
          ) : activeMediaType === "video" ? (
            <video
              key={activeMediaId}
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label={activeMediaName || "Full-screen post video"}
              className={`${hasCarousel ? "absolute left-1/2 top-1/2 aspect-[4/5] w-[min(90vw,68vh)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 object-contain" : "absolute inset-0 h-full w-full object-contain"} ${mediaSwipeClass}`}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <img
              key={activeMediaId}
              src={mediaUrl}
              alt={activeMediaName || "Full-screen post image"}
              className={`${hasCarousel ? "absolute left-1/2 top-1/2 aspect-[4/5] w-[min(90vw,68vh)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 object-contain" : "absolute inset-0 h-full w-full object-contain"} ${mediaSwipeClass}`}
              onClick={(event) => event.stopPropagation()}
            />
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/75" />

          <button type="button" onClick={(event) => { stopViewerClick(event); closeViewer(); }} aria-label="Back to posts" className="absolute left-4 top-[max(env(safe-area-inset-top),1rem)] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>

          <button type="button" aria-label="More post options" onClick={(event) => { stopViewerClick(event); setShowMoreMenu((open) => !open); }} className="absolute right-4 top-[max(env(safe-area-inset-top),1rem)] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
          </button>

          {showMoreMenu && <div onClick={stopViewerClick} className="absolute right-4 top-16 z-20 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#262626]/95 p-1 text-sm text-white shadow-xl backdrop-blur">
            <button type="button" onClick={() => { onSave?.(); setShowMoreMenu(false); }} className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-white/10">{isSaved ? "Remove from saved" : "Save post"}</button>
            <button type="button" onClick={() => { onShare?.(); closeViewer(); }} className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-white/10">Share post</button>
          </div>}

          <div className="absolute bottom-[25%] right-3 z-[2] flex flex-col items-center gap-4 text-[#f6f1e8] sm:right-6">
            <button type="button" aria-label={isLiked ? "Unlike post" : "Like post"} aria-pressed={isLiked} onClick={(event) => { stopViewerClick(event); onLike?.(); }} className="flex flex-col items-center gap-1 text-xs drop-shadow-lg"><span className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm ${isLiked || isPoppingLike ? "text-[#D4AF37]" : "text-white"}`}><svg viewBox="0 0 24 24" className={`h-6 w-6 transition-transform duration-300 ease-out ${isPoppingLike ? "scale-125 -rotate-12" : "scale-100 rotate-0"}`} fill={isLiked || isPoppingLike ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg></span>{likesCount}</button>
            <button type="button" aria-label="Dislike post" aria-pressed={isDisliked} onClick={(event) => { stopViewerClick(event); onDislike?.(); }} className={`flex flex-col items-center gap-1 text-xs drop-shadow-lg ${isDisliked ? "text-amber-300" : ""}`}><span className="flex h-11 w-11 items-center justify-center"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22L1.14 11.27c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5c0-1.1-.9-2-2-2ZM19 3v12h4V3h-4Z"/></svg></span>{dislikesCount}</button>
            <button type="button" aria-label="Open comments" onClick={(event) => { stopViewerClick(event); closeViewer(); onComments?.(); }} className="flex flex-col items-center gap-1 text-xs drop-shadow-lg"><span className="flex h-11 w-11 items-center justify-center"><svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8.5Z"/></svg></span>{commentsCount}</button>
            <button type="button" aria-label={isSaved ? "Remove saved post" : "Save post"} aria-pressed={isSaved} onClick={(event) => { stopViewerClick(event); onSave?.(); }} className={`flex flex-col items-center gap-1 text-xs drop-shadow-lg ${isSaved ? "text-amber-300" : ""}`}><span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"><svg viewBox="0 0 24 24" className="h-6 w-6" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4Z"/></svg></span></button>
          </div>

          <div className="absolute inset-x-0 bottom-24 z-[2] px-4 pb-3 pr-20 text-[#f6f1e8] sm:px-7 sm:pr-24">
            <div className="mb-3 flex items-center gap-3">
              <Link href={authorProfileUrl} onClick={closeViewer} aria-label={`View ${authorName}'s profile`} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white/20 text-lg font-bold text-white">{authorAvatarUrl ? <img src={authorAvatarUrl} alt="" className="h-full w-full object-cover"/> : authorName.charAt(0).toUpperCase()}</Link>
              <div className="min-w-0 flex-1 drop-shadow-lg"><Link href={authorProfileUrl} onClick={closeViewer} className="block truncate font-bold">{authorName}</Link><span className="block truncate text-sm text-white/80">{authorUsername}</span></div>
              {onFollow && <button type="button" disabled={isFollowPending} onClick={(event) => { stopViewerClick(event); onFollow(); }} className="shrink-0 rounded-full bg-[#f4efe6] px-5 py-2.5 text-sm font-semibold text-[#292724] disabled:opacity-60">{isFollowPending ? "…" : isFollowingAuthor ? "Following" : "Follow"}</button>}
            </div>
            {postContent && <p className="line-clamp-2 text-sm leading-5 drop-shadow-lg">{postContent}</p>}
          </div>
        </div>
      )}
    </>
  );
}
