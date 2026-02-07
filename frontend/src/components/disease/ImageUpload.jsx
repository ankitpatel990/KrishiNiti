/**
 * ImageUpload - Drag-and-drop and click-to-upload image component.
 *
 * Features:
 *  - Drag-and-drop zone with visual feedback
 *  - Click to browse file picker
 *  - Camera capture on mobile devices
 *  - Image preview with zoom (via modal)
 *  - Multi-image gallery support
 *  - Client-side validation (format, size)
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import {
  PhotoIcon,
  CameraIcon,
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { validateImageFile } from "@utils/validators";
import { generateId } from "@utils/helpers";
import { Modal } from "@components/common";

const MAX_IMAGES = 5;

const ACCEPTED_FORMATS = ".jpg,.jpeg,.png,.webp";

/**
 * @typedef {Object} UploadedImage
 * @property {string} id       - Unique identifier.
 * @property {File}   file     - Original File reference.
 * @property {string} preview  - Object URL for preview rendering.
 */

function ImageUpload({ images = [], onImagesChange, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // -------------------------------------------------------------------
  // Validation & processing
  // -------------------------------------------------------------------

  const processFiles = useCallback(
    (fileList) => {
      setValidationError("");

      const files = Array.from(fileList);
      const remaining = MAX_IMAGES - images.length;

      if (remaining <= 0) {
        setValidationError(`Maximum ${MAX_IMAGES} images allowed.`);
        return;
      }

      const filesToProcess = files.slice(0, remaining);
      const newImages = [];

      for (const file of filesToProcess) {
        const result = validateImageFile(file);
        if (!result.valid) {
          setValidationError(result.message);
          return;
        }

        newImages.push({
          id: generateId("img"),
          file,
          preview: URL.createObjectURL(file),
        });
      }

      if (files.length > remaining) {
        setValidationError(
          `Only ${remaining} more image(s) can be added. Extra files were ignored.`,
        );
      }

      onImagesChange([...images, ...newImages]);
    },
    [images, onImagesChange],
  );

  // -------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const { files } = e.dataTransfer;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [disabled, processFiles],
  );

  const handleFileSelect = useCallback(
    (e) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [processFiles],
  );

  const handleBrowseClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleCameraClick = useCallback(() => {
    if (!disabled) {
      cameraInputRef.current?.click();
    }
  }, [disabled]);

  const handleRemoveImage = useCallback(
    (imageId) => {
      const updated = images.filter((img) => img.id !== imageId);
      const removed = images.find((img) => img.id === imageId);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      onImagesChange(updated);
      setValidationError("");
    },
    [images, onImagesChange],
  );

  const handlePreview = useCallback((image) => {
    setPreviewImage(image);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  // -------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------

  const hasImages = images.length > 0;
  const canAddMore = images.length < MAX_IMAGES;

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleBrowseClick();
            }
          }}
          aria-label="Upload crop image. Click or drag and drop."
          aria-disabled={disabled}
          className={[
            "relative flex flex-col items-center justify-center gap-3",
            "rounded-xl border-2 border-dashed p-8 transition-all duration-200",
            "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
            disabled
              ? "border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-50"
              : isDragOver
                ? "border-primary-500 bg-primary-50"
                : "border-neutral-300 bg-white hover:border-primary-400 hover:bg-primary-50/50",
          ].join(" ")}
        >
          <div
            className={[
              "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
              isDragOver
                ? "bg-primary-100 text-primary-600"
                : "bg-neutral-100 text-neutral-400",
            ].join(" ")}
          >
            {isDragOver ? (
              <ArrowUpTrayIcon className="h-7 w-7" aria-hidden="true" />
            ) : (
              <PhotoIcon className="h-7 w-7" aria-hidden="true" />
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-neutral-700">
              {isDragOver
                ? "Drop your image here"
                : "Drag & drop crop image here"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              or click to browse from your device
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>JPEG, PNG, WebP</span>
            <span aria-hidden="true">|</span>
            <span>Max 10 MB</span>
            <span aria-hidden="true">|</span>
            <span>Up to {MAX_IMAGES} images</span>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            multiple
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      )}

      {/* Camera capture button (shown on touch devices) */}
      {canAddMore && (
        <div className="flex justify-center sm:hidden">
          <button
            type="button"
            onClick={handleCameraClick}
            disabled={disabled}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5",
              "text-sm font-medium transition-colors",
              "border border-primary-300 text-primary-700 bg-primary-50",
              "hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
            aria-label="Take photo with camera"
          >
            <CameraIcon className="h-5 w-5" aria-hidden="true" />
            Take Photo
          </button>

          {/* Hidden camera input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <p className="text-sm text-danger-600" role="alert">
          {validationError}
        </p>
      )}

      {/* Image gallery */}
      {hasImages && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700">
            Uploaded Images ({images.length}/{MAX_IMAGES})
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {images.map((image) => (
                <motion.div
                  key={image.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
                >
                  <img
                    src={image.preview}
                    alt={image.file.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />

                  {/* Overlay actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(image);
                      }}
                      className="rounded-full bg-white/90 p-2 text-neutral-700 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-label={`Preview ${image.file.name}`}
                    >
                      <MagnifyingGlassPlusIcon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(image.id);
                      }}
                      className="rounded-full bg-danger-500/90 p-2 text-white hover:bg-danger-600 transition-colors focus:outline-none focus:ring-2 focus:ring-danger-500"
                      aria-label={`Remove ${image.file.name}`}
                    >
                      <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* File name */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                    <p className="truncate text-xs text-white">
                      {image.file.name}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Image preview modal */}
      <Modal
        isOpen={Boolean(previewImage)}
        onClose={handleClosePreview}
        title={previewImage?.file?.name || "Image Preview"}
        size="xl"
      >
        {previewImage && (
          <div className="flex items-center justify-center">
            <img
              src={previewImage.preview}
              alt={previewImage.file.name}
              className="max-h-[70vh] w-auto rounded-lg object-contain"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

ImageUpload.propTypes = {
  images: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      file: PropTypes.instanceOf(File).isRequired,
      preview: PropTypes.string.isRequired,
    }),
  ),
  onImagesChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ImageUpload;
