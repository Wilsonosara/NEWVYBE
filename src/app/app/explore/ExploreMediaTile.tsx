"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../../utils/supabase/client";
import { getMedia } from "../../lib/mediaStorage";
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

export default function ExploreMediaTile({ post, media }: { post: Post; media: PostMedia | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");

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
  }, [mediaUrl]);

  return (
    <Link
      href={`/app?post=${post.id}`}
      aria-label={`Open post by ${post.author}`}
      className="group relative block aspect-square overflow-hidden rounded-2xl bg-gray-100"
    >
      {media?.mediaType === "video" ? (
        <video ref={videoRef} src={mediaUrl || undefined} poster={posterUrl || undefined} muted loop playsInline preload="metadata" aria-label={media.mediaName || "Explore video"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : media && mediaUrl ? (
        <img src={mediaUrl} alt={media.mediaName || post.content || "Explore post"} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 via-rose-50 to-amber-100 p-3 text-center text-xs font-medium text-gray-800 sm:p-5 sm:text-sm">
          <span className="line-clamp-6">{post.content || "A VYBE post"}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-2 pb-2 pt-8 sm:px-3 sm:pb-3">
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-white drop-shadow sm:text-sm">{post.content || post.author}</p>
      </div>
      {media?.mediaType === "video" && <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm" aria-label="Video"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="m8 5 12 7-12 7z" /></svg></span>}
    </Link>
  );
}
