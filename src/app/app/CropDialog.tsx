"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type CropDialogProps = {
  file: File;
  onCancel: () => void;
  onApply: (file: File) => void;
  initialAspectRatio?: number;
  initialAspectLabel?: string;
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

export default function CropDialog({ file, onCancel, onApply, initialAspectRatio, initialAspectLabel }: CropDialogProps) {
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
      setRatio(initialAspectRatio || initialRatio);
      setRatioName(initialAspectRatio ? initialAspectLabel || "Custom" : "Original");
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setCropRect({ left: 0, top: 0, right: 1, bottom: 1 });
    };
    nextImage.src = imageUrl;

    return () => URL.revokeObjectURL(imageUrl);
  }, [file, initialAspectLabel, initialAspectRatio]);

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
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4"
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
            ...(initialAspectRatio ? [[initialAspectLabel || "Custom", initialAspectRatio] as [string, number]] : []),
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
