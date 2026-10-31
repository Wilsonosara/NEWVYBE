
"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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

type CropDialogProps = {
  file: File;
  onCancel: () => void;
  onApply: (file: File) => void;
};

type CropRect = { left: number; top: number; right: number; bottom: number };
type CropDrag = {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  rect: CropRect;
  edges: { left: boolean; right: boolean; top: boolean; bottom: boolean };
};

function CropDialog({ file, onCancel, onApply }: CropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<CropDrag | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ratio, setRatio] = useState(1);
  const [ratioName, setRatioName] = useState("Square · 1:1");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState<CropRect>({
    left: 0,
    top: 0,
    right: 1,
    bottom: 1,
  });
  const [outputSize, setOutputSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const imageUrl = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      setImage(nextImage);
      const initialRatio = nextImage.naturalWidth / nextImage.naturalHeight;
      setRatio(initialRatio);
      setRatioName("Original");
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setCropRect({ left: 0, top: 0, right: 1, bottom: 1 });
    };
    nextImage.src = imageUrl;

    return () => URL.revokeObjectURL(imageUrl);
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const cropWidth = canvas.clientWidth;
    const cropHeight = canvas.clientHeight;
    if (!cropWidth || !cropHeight) return;

    const deviceScale = window.devicePixelRatio || 1;
    canvas.width = Math.round(cropWidth * deviceScale);
    canvas.height = Math.round(cropHeight * deviceScale);

    const baseScale = Math.max(
      cropWidth / image.naturalWidth,
      cropHeight / image.naturalHeight
    );
    const imageScale = baseScale * zoom;
    const imageWidth = image.naturalWidth * imageScale;
    const imageHeight = image.naturalHeight * imageScale;
    const maxOffsetX = Math.max(0, (imageWidth - cropWidth) / 2);
    const maxOffsetY = Math.max(0, (imageHeight - cropHeight) / 2);
    const offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x));
    const offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y));
    const drawX = (cropWidth - imageWidth) / 2 + offsetX;
    const drawY = (cropHeight - imageHeight) / 2 + offsetY;
    const cropLeft = cropRect.left * cropWidth;
    const cropTop = cropRect.top * cropHeight;
    const selectedWidth = (cropRect.right - cropRect.left) * cropWidth;
    const selectedHeight = (cropRect.bottom - cropRect.top) * cropHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    context.clearRect(0, 0, cropWidth, cropHeight);
    context.drawImage(image, drawX, drawY, imageWidth, imageHeight);
    context.fillStyle = "rgba(0, 0, 0, 0.48)";
    context.fillRect(0, 0, cropWidth, cropTop);
    context.fillRect(0, cropTop, cropLeft, selectedHeight);
    context.fillRect(
      cropLeft + selectedWidth,
      cropTop,
      cropWidth - cropLeft - selectedWidth,
      selectedHeight
    );
    context.fillRect(
      0,
      cropTop + selectedHeight,
      cropWidth,
      cropHeight - cropTop - selectedHeight
    );
    context.strokeStyle = "white";
    context.lineWidth = 2;
    context.strokeRect(cropLeft, cropTop, selectedWidth, selectedHeight);

    const handles = [
      [cropLeft, cropTop],
      [cropLeft + selectedWidth / 2, cropTop],
      [cropLeft + selectedWidth, cropTop],
      [cropLeft, cropTop + selectedHeight / 2],
      [cropLeft + selectedWidth, cropTop + selectedHeight / 2],
      [cropLeft, cropTop + selectedHeight],
      [cropLeft + selectedWidth / 2, cropTop + selectedHeight],
      [cropLeft + selectedWidth, cropTop + selectedHeight],
    ];
    context.fillStyle = "white";
    context.strokeStyle = "#4b5563";
    context.lineWidth = 1;
    for (const [x, y] of handles) {
      context.fillRect(x - 4, y - 4, 8, 8);
      context.strokeRect(x - 4, y - 4, 8, 8);
    }

    setOutputSize({
      width: Math.round(selectedWidth / imageScale),
      height: Math.round(selectedHeight / imageScale),
    });
  }, [cropRect, image, offset, ratio, zoom]);

  function chooseRatio(name: string, value: number) {
    setRatioName(name);
    setRatio(value);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCropRect({ left: 0, top: 0, right: 1, bottom: 1 });
  }

  function startDragging(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const handleRadius = 18;
    const cropLeft = cropRect.left * bounds.width;
    const cropRight = cropRect.right * bounds.width;
    const cropTop = cropRect.top * bounds.height;
    const cropBottom = cropRect.bottom * bounds.height;
    const nearLeft = Math.abs(x - cropLeft) <= handleRadius;
    const nearRight = Math.abs(x - cropRight) <= handleRadius;
    const nearTop = Math.abs(y - cropTop) <= handleRadius;
    const nearBottom = Math.abs(y - cropBottom) <= handleRadius;
    const onCropEdge =
      ((nearLeft || nearRight) && y >= cropTop - handleRadius && y <= cropBottom + handleRadius) ||
      ((nearTop || nearBottom) && x >= cropLeft - handleRadius && x <= cropRight + handleRadius);

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
      rect: cropRect,
      edges: {
        left: onCropEdge && nearLeft && !nearRight,
        right: onCropEdge && nearRight && !nearLeft,
        top: onCropEdge && nearTop && !nearBottom,
        bottom: onCropEdge && nearBottom && !nearTop,
      },
    };
  }

  function dragImage(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaX = (event.clientX - drag.x) / bounds.width;
    const deltaY = (event.clientY - drag.y) / bounds.height;
    const minimumCropSize = 0.05;

    if (Object.values(drag.edges).some(Boolean)) {
      const nextRect = { ...drag.rect };
      if (drag.edges.left) {
        nextRect.left = Math.max(0, Math.min(drag.rect.right - minimumCropSize, drag.rect.left + deltaX));
      }
      if (drag.edges.right) {
        nextRect.right = Math.min(1, Math.max(drag.rect.left + minimumCropSize, drag.rect.right + deltaX));
      }
      if (drag.edges.top) {
        nextRect.top = Math.max(0, Math.min(drag.rect.bottom - minimumCropSize, drag.rect.top + deltaY));
      }
      if (drag.edges.bottom) {
        nextRect.bottom = Math.min(1, Math.max(drag.rect.top + minimumCropSize, drag.rect.bottom + deltaY));
      }
      setCropRect(nextRect);
      setRatioName("Custom crop");
      return;
    }

    setOffset({
      x: drag.offsetX + event.clientX - drag.x,
      y: drag.offsetY + event.clientY - drag.y,
    });
  }

  function stopDragging(event: ReactPointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function applyCrop() {
    const canvas = canvasRef.current;
    if (!canvas || !image || outputSize.width < 1 || outputSize.height < 1) return;

    const output = document.createElement("canvas");
    output.width = outputSize.width;
    output.height = outputSize.height;
    const context = output.getContext("2d");
    if (!context) return;

    const cropWidth = canvas.clientWidth;
    const cropHeight = canvas.clientHeight;
    const imageScale = Math.max(
      cropWidth / image.naturalWidth,
      cropHeight / image.naturalHeight
    ) * zoom;
    const imageWidth = image.naturalWidth * imageScale;
    const imageHeight = image.naturalHeight * imageScale;
    const maxOffsetX = Math.max(0, (imageWidth - cropWidth) / 2);
    const maxOffsetY = Math.max(0, (imageHeight - cropHeight) / 2);
    const offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x));
    const offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y));
    const drawX = (cropWidth - imageWidth) / 2 + offsetX;
    const drawY = (cropHeight - imageHeight) / 2 + offsetY;
    const cropLeft = cropRect.left * cropWidth;
    const cropTop = cropRect.top * cropHeight;
    const sourceX = Math.max(0, (cropLeft - drawX) / imageScale);
    const sourceY = Math.max(0, (cropTop - drawY) / imageScale);

    context.drawImage(
      image,
      sourceX,
      sourceY,
      output.width,
      output.height,
      0,
      0,
      output.width,
      output.height
    );

    output.toBlob((blob) => {
      if (!blob) return;
      const nameParts = file.name.split(".");
      const extension = nameParts.length > 1 ? nameParts.pop() : "jpg";
      const baseName = nameParts.join(".") || file.name;
      onApply(
        new File([blob], `${baseName}-cropped.${extension}`, {
          type: blob.type || file.type,
          lastModified: Date.now(),
        })
      );
    }, file.type || "image/jpeg");
  }

  const cropMaxWidth = Math.min(560, 360 * ratio);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-image-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="crop-image-title" className="text-lg font-semibold text-gray-900">
              Crop photo
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Drag the image, or pull an edge to crop from that side.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close crop editor"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="mt-5 flex justify-center overflow-hidden rounded-xl bg-gray-100 p-2">
          <div
            className="max-h-[55vh] w-full overflow-hidden rounded-lg bg-gray-200"
            style={{ maxWidth: `${cropMaxWidth}px`, aspectRatio: `${ratio}` }}
          >
            <canvas
              ref={canvasRef}
              className="h-full w-full touch-none cursor-crosshair"
              onPointerDown={startDragging}
              onPointerMove={dragImage}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              aria-label="Crop preview. Drag the image or its crop edges to adjust the crop."
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Crop aspect ratio">
          {[
            ["Original", image ? image.naturalWidth / image.naturalHeight : 1],
            ["Square · 1:1", 1],
            ["Portrait · 4:5", 4 / 5],
            ["Landscape · 16:9", 16 / 9],
          ].map(([name, value]) => (
            <button
              key={name}
              type="button"
              onClick={() => chooseRatio(String(name), Number(value))}
              aria-pressed={ratioName === name}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                ratioName === name
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm text-gray-700">
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="mt-2 w-full accent-gray-900"
          />
        </label>

        <p className="mt-3 text-xs text-gray-500" aria-live="polite">
          {ratioName} · Output size: {outputSize.width} × {outputSize.height} px
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyCrop}
            disabled={!image}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePageContent() {
  const { addPost } = usePosts();
  const searchParams = useSearchParams();

  const requestedClub = searchParams.get("club")?.trim() || "";

  const [post, setPost] = useState("");
  const [world, setWorld] = useState("Social");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
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

  function applyImageCrop(file: File) {
    if (cropIndex === null) return;
    setSelectedImages((current) =>
      current.map((image, index) => (index === cropIndex ? file : image))
    );
    setCropIndex(null);
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
