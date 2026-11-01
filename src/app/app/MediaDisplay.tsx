"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import { getMedia } from "../lib/mediaStorage";

type MediaDisplayProps = {
  mediaId?: string;
  mediaType?: "image" | "video";
  mediaName?: string;
  onNavigate?: (direction: "next" | "previous") => void;
};

export default function MediaDisplay({
  mediaId,
  mediaType,
  mediaName,
  onNavigate,
}: MediaDisplayProps) {
  const [mediaUrl, setMediaUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const navigationTriggeredRef = useRef(false);

  const navigateToPost = useCallback((direction: "next" | "previous") => {
    if (!onNavigate) return;
    if (navigationTriggeredRef.current) return;
    navigationTriggeredRef.current = true;
    setIsFullscreen(false);
    onNavigate(direction);
  }, [onNavigate]);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const resetState = () => {
      setMediaUrl("");
      setFailed(false);
      setIsFullscreen(false);
    };

    if (!mediaId || !mediaType) {
      const resetTimeout = window.setTimeout(resetState, 0);

      return () => {
        active = false;
        window.clearTimeout(resetTimeout);
      };
    }

    const currentMediaId: string = mediaId;

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
  }, [mediaId, mediaType]);

  useEffect(() => {
    if (!isFullscreen) return;
    navigationTriggeredRef.current = false;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        navigateToPost("next");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        navigateToPost("previous");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, navigateToPost]);

  if (!mediaId || !mediaType) {
    return null;
  }

  if (failed) {
    return (
      <p className="my-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
        This media could not be loaded. Please check the upload and storage
        settings.
      </p>
    );
  }

  if (!mediaUrl) {
    return (
      <div className="flex min-h-24 w-full items-center justify-center bg-gray-50 text-sm text-gray-400">
        Loading media...
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 w-full overflow-hidden bg-black sm:rounded-xl">
        {mediaType === "video" ? (
          <video
            src={mediaUrl}
            controls
            playsInline
            preload="metadata"
            aria-label={mediaName || "Post video"}
            onClick={() => setIsFullscreen(true)}
            className="block max-h-[85vh] w-full cursor-pointer object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            aria-label="Open image full screen"
            className="block w-full cursor-zoom-in bg-white p-0"
          >
            <img
              src={mediaUrl}
              alt={mediaName || "Post image"}
              loading="lazy"
              className="block h-auto max-h-[85vh] w-full object-contain"
            />
          </button>
        )}
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen media viewer. Scroll or swipe to move between posts."
          onClick={() => setIsFullscreen(false)}
          onWheel={(event) => {
            if (Math.abs(event.deltaY) < 30 || !onNavigate) return;
            event.preventDefault();
            navigateToPost(event.deltaY > 0 ? "next" : "previous");
          }}
          onTouchStart={(event) => {
            touchStartYRef.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={(event) => {
            const startY = touchStartYRef.current;
            const endY = event.changedTouches[0]?.clientY;
            touchStartYRef.current = null;

            if (startY === null || endY === undefined || !onNavigate) return;
            const distance = startY - endY;
            if (Math.abs(distance) < 55) return;
            navigateToPost(distance > 0 ? "next" : "previous");
          }}
        >
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            aria-label="Close full-screen viewer"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-3xl leading-none text-white"
          >
            ×
          </button>

          {mediaType === "video" ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label={mediaName || "Full-screen post video"}
              className="h-full w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <img
              src={mediaUrl}
              alt={mediaName || "Full-screen post image"}
              className="h-full w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
