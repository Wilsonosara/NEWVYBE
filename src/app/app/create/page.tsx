
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePosts } from "../PostContext";

const worlds = [
  "Social",
  "Sports",
  "Learn",
  "Career",
  "Business",
  "Gaming",
  "Entertainment",
  "Create",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function CreatePageContent() {
  const { addPost } = usePosts();
  const searchParams = useSearchParams();

  const requestedClub = searchParams.get("club")?.trim() || "";

  const [post, setPost] = useState("");
  const [world, setWorld] = useState("Social");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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

    const url = URL.createObjectURL(selectedVideo);
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

    if (selectedVideo) {
      setSelectedVideo(null);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }

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
      setSelectedImages((current) => [...current, ...validImages]);
    }

    if (errors.length > 0) {
      setError(errors.join(" "));
    }
  }

  function handleVideoSelection(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Video files must be 50 MB or smaller.");
      return;
    }

    setError("");
    setSelectedImages([]);
    setSelectedVideo(file);

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    setSelectedImages((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function clearMedia() {
    setSelectedImages([]);
    setSelectedVideo(null);

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  }

  async function handlePost() {
    if (
      !post.trim() &&
      selectedImages.length === 0 &&
      !selectedVideo
    ) {
      setError(
        "Write something or add photos or a video before publishing."
      );
      return;
    }

    setIsPublishing(true);
    setError("");

    try {
      const filesToPublish =
        selectedImages.length > 0
          ? selectedImages
          : selectedVideo
            ? [selectedVideo]
            : [];

      await addPost(
        post.trim(),
        world,
        filesToPublish.length > 0 ? filesToPublish : undefined,
        world === "Sports" && requestedClub
          ? requestedClub
          : undefined
      );

      setPost("");
      setWorld(requestedClub ? "Sports" : "Social");
      clearMedia();

      window.alert("Your post has been published successfully.");
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
    <main className="min-h-screen bg-white px-4 py-8 text-gray-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <p className="text-sm font-semibold tracking-tight text-gray-500">
            VYBE
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
            Create a post
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Share your thoughts, moments, and ideas with your community.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5 sm:px-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-800">
              G
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Genius
              </p>
              <p className="text-sm text-gray-500">@genius</p>
            </div>

            <div className="ml-auto rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
              {world}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <label htmlFor="post-content" className="sr-only">
              What would you like to share?
            </label>

            <textarea
              id="post-content"
              value={post}
              onChange={(event) => setPost(event.target.value)}
              placeholder="What would you like to share?"
              rows={6}
              maxLength={5000}
              className="min-h-40 w-full resize-y border-0 bg-transparent text-base leading-7 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0"
            />

            <div className="mt-2 flex items-center justify-between border-b border-gray-100 pb-5">
              <p className="text-xs text-gray-400">
                Share something worth sharing.
              </p>

              <p className="text-xs tabular-nums text-gray-400">
                {post.length}/5000
              </p>
            </div>

            {selectedImages.length > 0 && (
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">
                    Selected photos ({selectedImages.length})
                  </p>

                  <button
                    type="button"
                    onClick={clearMedia}
                    className="text-xs font-medium text-gray-500 transition hover:text-gray-900"
                  >
                    Remove all
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedImages.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreviews[index]}
                        alt={`Selected photo ${index + 1}`}
                        className="aspect-square w-full object-cover"
                      />

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
            )}

            {selectedVideo && videoPreview && (
              <div className="relative mt-5 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <video
                  src={videoPreview}
                  controls
                  className="max-h-[440px] w-full"
                />

                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute right-3 top-3 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Remove video
                </button>

                <p className="truncate border-t border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
                  {selectedVideo.name}
                </p>
              </div>
            )}

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
                          ? "border-gray-900 bg-gray-900 font-medium text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-5">
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
                accept="video/*"
                className="hidden"
                onChange={(event) =>
                  handleVideoSelection(event.target.files?.[0])
                }
              />

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={Boolean(selectedVideo) || isPublishing}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                {selectedImages.length > 0
                  ? "Add more photos"
                  : "Photo"}
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={selectedImages.length > 0 || isPublishing}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                >
                  <rect x="3" y="5" width="13" height="14" rx="2" />
                  <path d="m16 10 5-3v10l-5-3z" />
                </svg>
                Video
              </button>

              {hasMedia && (
                <span className="max-w-full truncate text-xs text-gray-500">
                  {selectedImages.length > 0
                    ? `${selectedImages.length} photo${selectedImages.length === 1 ? "" : "s"} selected`
                    : selectedVideo?.name}
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

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-400">
                Your post will appear in the selected world.
              </p>

              <button
                type="button"
                onClick={handlePost}
                disabled={
                  isPublishing ||
                  (!post.trim() && !hasMedia)
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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

        <p className="mt-5 text-center text-xs text-gray-400">
          One platform. Many worlds. One community.
        </p>
      </div>
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
