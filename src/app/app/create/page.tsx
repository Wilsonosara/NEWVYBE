
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
      setError("A post can contain up to 10 media items. Remove a photo before adding a video.");
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
        "Write something or add photos or a video before publishing."
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

      await addPost(
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
    <main className="min-h-screen bg-[#f1f3fa] px-4 py-7 text-[#273b48] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 sm:mb-8">
          <p className="text-5xl font-light leading-none tracking-tight text-[#c6cdd2] sm:text-7xl">06</p>
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
                <button type="button" onClick={() => photoInputRef.current?.click()} disabled={isPublishing || selectedImages.length + (selectedVideo ? 1 : 0) >= 10} className="rounded-full bg-[#eef0f7] px-4 py-2 text-sm font-medium text-[#445563] hover:bg-[#e4e7f2] disabled:opacity-50">Add photos</button>
                <button type="button" onClick={() => videoInputRef.current?.click()} disabled={Boolean(selectedVideo) || isPublishing || selectedImages.length >= 10} className="rounded-full bg-[#eef0f7] px-4 py-2 text-sm font-medium text-[#445563] hover:bg-[#e4e7f2] disabled:opacity-50">Add video</button>
                <span className="rounded-full px-4 py-2 text-sm text-gray-400" title="Audio posting will be available when VYBE has a music license">Audio</span>
              </div>
              <p className="mb-3 text-xs text-[#8996a2]">Choose up to 10 items, including photos and one video · 50 MB max per file</p>
            </div>

            <div className="mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">
                    {selectedImages.length > 0 ? `Selected photos (${selectedImages.length})` : "Photos"}
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
                      Remove photos
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {selectedImages.length < 10 && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isPublishing || selectedImages.length + (selectedVideo ? 1 : 0) >= 10}
                      aria-label="Add another photo"
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
                    selectedImages.length > 0 ? `${selectedImages.length} photo${selectedImages.length === 1 ? "" : "s"}` : "",
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
