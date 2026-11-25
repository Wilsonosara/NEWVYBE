
"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePosts } from "../PostContext";
import CropDialog from "../CropDialog";

const worlds = [
  "Social",
  "Sports",
  "Career",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|m4v|mov|webm|avi|mpeg|mpeg1|mpeg2|mpg|mpe|mpv|m1v|m2v|vob|ogv|wmv|3gp)$/i.test(file.name);
}

function getVideoMimeType(file: File) {
  if (file.type.startsWith("video/")) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (["mpeg", "mpeg1", "mpeg2", "mpg", "mpe", "mpv", "m1v", "m2v", "vob"].includes(extension || "")) return "video/mpeg";
  if (["mp4", "m4v"].includes(extension || "")) return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  if (extension === "avi") return "video/x-msvideo";
  if (extension === "ogv") return "video/ogg";
  if (extension === "wmv") return "video/x-ms-wmv";
  if (extension === "3gp") return "video/3gpp";
  return "video/mp4";
}

function CreatePageContent() {
  const { addPost } = usePosts();
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedClub = searchParams.get("club")?.trim() || "";

  const [post, setPost] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [world, setWorld] = useState("Social");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [selectedMediaOrder, setSelectedMediaOrder] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [videoCover, setVideoCover] = useState<File | null>(null);
  const [videoCoverPreview, setVideoCoverPreview] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!videoCover) {
      const clearPreview = window.setTimeout(() => setVideoCoverPreview(""), 0);
      return () => window.clearTimeout(clearPreview);
    }
    const url = URL.createObjectURL(videoCover);
    const updatePreview = window.setTimeout(() => setVideoCoverPreview(url), 0);
    return () => {
      window.clearTimeout(updatePreview);
      URL.revokeObjectURL(url);
    };
  }, [videoCover]);

  async function saveCurrentVideoFrame() {
    const video = videoElementRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) return;
    setVideoCover(new File([blob], "video-cover.jpg", { type: "image/jpeg" }));
  }

  useEffect(() => {
    if (!requestedClub) return;

    const updateWorld = window.setTimeout(() => setWorld("Sports"), 0);

    return () => window.clearTimeout(updateWorld);
  }, [requestedClub]);

  useEffect(() => {
    const urls = selectedImages.map((file) =>
      URL.createObjectURL(file)
    );

    const updatePreviews = window.setTimeout(
      () => setImagePreviews(urls),
      0
    );

    return () => {
      window.clearTimeout(updatePreviews);
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedImages]);

  useEffect(() => {
    if (!selectedVideo) {
      const clearPreview = window.setTimeout(
        () => setVideoPreview(""),
        0
      );

      return () => window.clearTimeout(clearPreview);
    }

    const previewSource = selectedVideo.type.startsWith("video/")
      ? selectedVideo
      : new Blob([selectedVideo], { type: getVideoMimeType(selectedVideo) });
    const url = URL.createObjectURL(previewSource);
    const updatePreview = window.setTimeout(
      () => setVideoPreview(url),
      0
    );

    return () => {
      window.clearTimeout(updatePreview);
      URL.revokeObjectURL(url);
    };
  }, [selectedVideo]);

  function handleImageSelection(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError("");

    const incomingFiles = Array.from(files);
    const validImages: File[] = [];
    const errors: string[] = [];

    for (const file of incomingFiles) {
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name} is not an image.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds the 50 MB limit.`);
        continue;
      }

      validImages.push(file);
    }

    if (validImages.length > 0) {
      const availableSlots = Math.max(0, 10 - selectedImages.length - (selectedVideo ? 1 : 0));
      const accepted = validImages.slice(0, availableSlots);
      setSelectedImages((current) => [...current, ...accepted]);
      setSelectedMediaOrder((current) => [...current, ...accepted]);
      if (accepted.length < validImages.length) {
        setError("You can add up to 10 total media items to a post.");
      }
    }

    if (errors.length > 0) {
      setError(errors.join(" "));
    }
  }

  function handleVideoSelection(file?: File) {
    if (!file) return;

    if (!isVideoFile(file)) {
      setError("Please select a valid video file.");
      return;
    }

    if (selectedImages.length >= 10) {
      setError("A post can contain up to 10 media items. Remove an image before adding a video.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Video files must be 50 MB or smaller.");
      return;
    }

    setError("");
    setSelectedVideo(file);
    setVideoCover(null);
    setVideoDuration(0);
    setVideoCurrentTime(0);
    setSelectedMediaOrder((current) => [...current, file]);
  }

  function removeImage(index: number) {
    const removedFile = selectedImages[index];
    setSelectedImages((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
    setSelectedMediaOrder((current) => current.filter((file) => file !== removedFile));

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function applyImageCrop(file: File) {
    if (cropIndex === null) return;
    const previousFile = selectedImages[cropIndex];
    setSelectedImages((current) =>
      current.map((image, index) => (index === cropIndex ? file : image))
    );
    setSelectedMediaOrder((current) => current.map((item) => item === previousFile ? file : item));
    setCropIndex(null);
  }

  function clearMedia() {
    setSelectedImages([]);
    setSelectedVideo(null);
    setVideoCover(null);
    setVideoDuration(0);
    setVideoCurrentTime(0);
    setSelectedMediaOrder([]);

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  }

  function addKeywords(rawValue = keywordInput) {
    const additions = rawValue
      .split(/[\s,]+/)
      .map((value) => value.replace(/^#/, "").trim())
      .filter(Boolean);

    if (additions.length === 0) return;

    setKeywords((current) =>
      [...new Set([...current, ...additions])].slice(0, 10)
    );
    setKeywordInput("");
  }

  async function handlePost() {
    if (
      !post.trim() &&
      selectedImages.length === 0 &&
      !selectedVideo
    ) {
      setError(
        "Write something or add images or a video before publishing."
      );
      return;
    }

    setIsPublishing(true);
    setError("");

    try {
      const filesToPublish = selectedMediaOrder;

      const postContent = [
        post.trim(),
        keywords.length ? keywords.map((keyword) => `#${keyword}`).join(" ") : "",
      ].filter(Boolean).join("\n\n");

      const newPostId = await addPost(
        postContent,
        world,
        filesToPublish.length > 0 ? filesToPublish : undefined,
        world === "Sports" && requestedClub
          ? requestedClub
          : undefined,
        selectedVideo ? videoCover ?? undefined : undefined
      );

      setPost("");
      setKeywords([]);
      setKeywordInput("");
      setWorld(requestedClub ? "Sports" : "Social");
      clearMedia();
      router.push(newPostId ? `/app?post=${encodeURIComponent(String(newPostId))}` : "/app");
    } catch (err) {
      console.error("Error publishing post:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while publishing. Please try again."
      );
    } finally {
      setIsPublishing(false);
    }
  }

  const hasMedia =
    selectedImages.length > 0 || selectedVideo !== null;

  return (
    <main className="min-h-screen bg-[#f1f3fa] px-4 py-7 text-[#273b48] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 sm:mb-8">
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Create Post</h1>
        </header>

        <section className="overflow-hidden rounded-[28px] bg-white p-4 shadow-[0_14px_45px_rgba(39,59,72,0.08)] sm:p-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">New post</h2>
            <span className="rounded-full bg-[#f1f3f8] px-3 py-1.5 text-xs font-semibold text-[#566675]">{world}</span>
          </div>

          <div>
            <label htmlFor="post-content" className="sr-only">
              What would you like to share?
            </label>

            <textarea
              id="post-content"
              value={post}
              onChange={(event) => setPost(event.target.value)}
              placeholder="What would you like to share?"
              rows={3}
              maxLength={5000}
              className="min-h-24 w-full resize-y rounded-2xl bg-[#f1f3f8] px-4 py-4 text-sm leading-6 text-[#273b48] outline-none placeholder:text-[#a9b1ba] focus:ring-2 focus:ring-[#7d80e8]/30 sm:min-h-28 sm:px-5"
            />

            <div className="mt-2 flex items-center justify-end pb-2">
              <p className="text-xs tabular-nums text-[#98a2ad]">
                {post.length}/5000
              </p>
            </div>

            <div className="mt-2">
              <p className="mb-2 text-sm font-semibold text-[#344957]">Add media</p>
              <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Media type">
                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={isPublishing || selectedImages.length + (selectedVideo ? 1 : 0) >= 10} className="rounded-full bg-[#eef0f7] px-4 py-2 text-sm font-medium text-[#445563] hover:bg-[#e4e7f2] disabled:opacity-50">Add images</button>
                <button type="button" onClick={() => videoInputRef.current?.click()} disabled={Boolean(selectedVideo) || isPublishing || selectedImages.length >= 10} className="rounded-full bg-[#eef0f7] px-4 py-2 text-sm font-medium text-[#445563] hover:bg-[#e4e7f2] disabled:opacity-50">Add video</button>
                <span className="rounded-full px-4 py-2 text-sm text-gray-400" title="Audio posting will be available when VYBE has a music license">Audio</span>
              </div>
            </div>

            <div className="mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">
                    {selectedImages.length > 0 ? `Selected images (${selectedImages.length})` : "Images"}
                  </p>

                  {selectedImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImages([]);
                        setSelectedMediaOrder((current) => selectedVideo ? current.filter((item) => item === selectedVideo) : []);
                        if (photoInputRef.current) photoInputRef.current.value = "";
                      }}
                      className="text-xs font-medium text-gray-500 transition hover:text-gray-900"
                    >
                      Remove images
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {selectedImages.length < 10 && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isPublishing || selectedImages.length + (selectedVideo ? 1 : 0) >= 10}
                      aria-label="Add another image"
                      className="flex aspect-square items-center justify-center rounded-2xl bg-[#f1f3f8] text-3xl font-light text-[#687987] transition hover:bg-[#e8ebf4] disabled:opacity-50"
                    >
                      +
                    </button>
                  )}
                  {selectedImages.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreviews[index]}
                        alt={`Selected image ${index + 1}`}
                        className="aspect-square w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => setCropIndex(index)}
                        aria-label={`Crop ${file.name}`}
                        className="absolute bottom-12 left-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                      >
                        Crop
                      </button>

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        aria-label={`Remove ${file.name}`}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-700 shadow-sm transition hover:bg-gray-100"
                      >
                        ×
                      </button>

                      <p className="truncate border-t border-gray-200 bg-white px-2 py-2 text-xs text-gray-500">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
            </div>

            {selectedVideo && videoPreview && (
              <div className="relative mt-5 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <video
                  ref={videoElementRef}
                  src={videoPreview}
                  controls
                  playsInline
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration;
                    setVideoDuration(Number.isFinite(duration) ? duration : 0);
                    if (duration > 0) {
                      event.currentTarget.currentTime = Math.min(0.25, duration / 10);
                      setVideoCurrentTime(event.currentTarget.currentTime);
                    }
                  }}
                  onTimeUpdate={(event) => setVideoCurrentTime(event.currentTarget.currentTime)}
                  onSeeked={() => { if (!videoCover) void saveCurrentVideoFrame(); }}
                  className="max-h-[440px] w-full"
                />

                <div className="space-y-3 border-t border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800">Choose video cover</p>
                    <button type="button" onClick={() => void saveCurrentVideoFrame()} disabled={!videoDuration || isPublishing} className="rounded-full bg-[#eef0f7] px-3 py-2 text-xs font-semibold text-[#445563] disabled:opacity-50">Use this frame</button>
                  </div>
                  <input aria-label="Choose video cover frame" type="range" min={0} max={videoDuration || 1} step="0.1" value={videoCurrentTime} onChange={(event) => { const time = Number(event.target.value); setVideoCurrentTime(time); if (videoElementRef.current) videoElementRef.current.currentTime = time; }} disabled={!videoDuration || isPublishing} className="w-full accent-[#7d80e8]" />
                  <div className="flex items-center gap-3">
                    {videoCoverPreview ? <img src={videoCoverPreview} alt="Selected video cover preview" className="h-16 w-24 rounded-lg bg-black object-cover" /> : <div className="h-16 w-24 animate-pulse rounded-lg bg-gray-200" />}
                    <p className="text-xs text-gray-500">Drag to a frame, then choose it as the cover. This image appears before the video plays.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedVideo(null);
                    setVideoCover(null);
                    setVideoDuration(0);
                    setVideoCurrentTime(0);
                    setSelectedMediaOrder((current) => current.filter((item) => item !== selectedVideo));
                    if (videoInputRef.current) videoInputRef.current.value = "";
                  }}
                  className="absolute right-3 top-3 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Remove video
                </button>

                <p className="truncate border-t border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
                  {selectedVideo.name}
                </p>
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-[#f1f3f8] px-4 py-3">
              <label htmlFor="post-keywords" className="sr-only">Keywords</label>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-[#8a96a1]">⌑</span>
                <input
                  id="post-keywords"
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addKeywords();
                    }
                  }}
                  onBlur={() => { if (keywordInput.trim()) addKeywords(); }}
                  placeholder="Keywords · press Enter to add"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a9b1ba]"
                  aria-label="Add post keywords"
                />
                {keywordInput.trim() && <button type="button" onClick={() => addKeywords()} className="text-xs font-semibold text-[#7379df]">Add</button>}
              </div>
              {keywords.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{keywords.map((keyword) => <button key={keyword} type="button" onClick={() => setKeywords((current) => current.filter((item) => item !== keyword))} className="rounded-full bg-white px-3 py-1 text-xs text-[#566675]">#{keyword} <span aria-hidden="true">×</span></button>)}</div>}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-gray-800">
                Choose a world
              </p>

              <div className="flex flex-wrap gap-2">
                {worlds.map((item) => {
                  const isSelected = world === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setWorld(item)}
                      aria-pressed={isSelected}
                      className={`rounded-full border px-3.5 py-2 text-sm transition ${
                        isSelected
                          ? "border-[#7d80e8] bg-[#7d80e8] font-medium text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-[#7d80e8] hover:text-gray-900"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) =>
                  handleImageSelection(event.target.files)
                }
              />

              <input
                ref={videoInputRef}
                type="file"
                  accept="video/*,.mp4,.m4v,.mov,.webm,.avi,.mpeg,.mpeg1,.mpeg2,.mpg,.mpe,.mpv,.m1v,.m2v,.vob,.ogv,.wmv,.3gp"
                className="hidden"
                onChange={(event) =>
                  handleVideoSelection(event.target.files?.[0])
                }
              />

              {hasMedia && (
                <span className="max-w-full truncate text-xs text-gray-500">
                  {[
                    selectedImages.length > 0 ? `${selectedImages.length} image${selectedImages.length === 1 ? "" : "s"}` : "",
                    selectedVideo?.name || "",
                  ].filter(Boolean).join(" + ")}
                </span>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={handlePost}
                disabled={
                  isPublishing ||
                  (!post.trim() && !hasMedia)
                }
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#7d80e8] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6f72d9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPublishing && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 animate-spin"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="3"
                      opacity="0.25"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {isPublishing ? "Publishing..." : "Publish post"}
              </button>
            </div>
          </div>
        </section>

      </div>

      {cropIndex !== null && selectedImages[cropIndex] && (
        <CropDialog
          file={selectedImages[cropIndex]}
          onCancel={() => setCropIndex(null)}
          onApply={applyImageCrop}
        />
      )}
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreatePageContent />
    </Suspense>
  );
}
