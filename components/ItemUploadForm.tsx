"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import ConfettiButton, { CONFETTI_MS } from "@/components/ConfettiButton";
import TextField, { FormError, TextAreaField } from "@/components/TextField";
import { ALLOWED_IMAGE_TYPES, ITEM_DESCRIPTION_MAX_LENGTH, ITEM_NAME_MAX_LENGTH } from "@/lib/constants";
import { UploadError, uploadToCloudinary } from "@/lib/upload-client";
import { fieldErrorsOf, itemFieldsSchema, parsePriceInput, validateImageFile } from "@/lib/validations";
import type { ApiErrorBody, CreateItemResponse, UploadSignature } from "@/types/api";
import type { ItemDTO } from "@/types/item";

type Status = "idle" | "uploading" | "saving" | "finishing" | "success";
type FieldName = "image" | "name" | "price" | "description";
type FieldErrors = Partial<Record<FieldName, string>>;

class RequestError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new RequestError("We couldn't reach the server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!res.ok || !data) {
    throw new RequestError(data?.error ?? "Something went wrong. Please try again.", data?.fieldErrors);
  }
  return data;
}

const availableFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function ItemUploadForm() {
  const ids = {
    image: useId(),
    name: useId(),
    price: useId(),
    description: useId(),
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [saved, setSaved] = useState<ItemDTO | null>(null);

  const busy = status === "uploading" || status === "saving" || status === "finishing";
  // Bumped on each valid "Start the pause" press to replay the star burst.
  const [burst, setBurst] = useState(0);

  function replacePreview(next: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = next ? URL.createObjectURL(next) : null;
    setPreviewUrl(previewUrlRef.current);
  }

  // Release the object URL when the form unmounts.
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  /** Shared by the file picker and drag-and-drop. */
  function selectFile(next: File | null) {
    const error = next ? validateImageFile(next) : null;
    setFieldErrors((prev) => ({ ...prev, image: error ?? undefined }));
    if (error) {
      setFile(null);
      replacePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(next);
    replacePreview(next);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    selectFile(e.target.files?.[0] ?? null);
  }

  // Counts enter/leave pairs so moving over the preview image doesn't flicker the highlight.
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  function handleDragEnter(e: DragEvent<HTMLLabelElement>) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    if (!busy) setDragging(true);
  }

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = busy ? "none" : "copy";
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (busy) return;
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) {
      // e.g. an image dragged from another web page arrives as a link, not a file.
      setFieldErrors((prev) => ({ ...prev, image: "Drop a photo saved on your device, or tap to choose one." }));
      return;
    }
    selectFile(dropped);
  }

  // A file dropped beside the box would otherwise make the browser open it and leave the form.
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  function resetForm() {
    setFile(null);
    replacePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setName("");
    setPrice("");
    setDescription("");
    setFieldErrors({});
    setFormError(null);
    setSaved(null);
    setStatus("idle");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;

    const errors: FieldErrors = {};
    const imageError = validateImageFile(file);
    if (imageError) errors.image = imageError;
    const parsed = itemFieldsSchema.safeParse({
      name,
      price: parsePriceInput(price),
      description,
    });
    if (!parsed.success) Object.assign(errors, fieldErrorsOf(parsed.error));

    setFieldErrors(errors);
    setFormError(null);
    if (!parsed.success || imageError || !file) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    submittingRef.current = true;
    // The stars burst as soon as the pause starts, like the Figma button.
    setBurst((b) => b + 1);
    const burstStarted = performance.now();
    try {
      setStatus("uploading");
      const signature = await postJson<UploadSignature>("/api/uploads/signature");
      const imagePublicId = await uploadToCloudinary(file, signature);

      setStatus("saving");
      const { item } = await postJson<CreateItemResponse>("/api/items", {
        ...parsed.data,
        imagePublicId,
      });
      setSaved(item);
      // Let the burst finish before the form is replaced by the confirmation.
      setStatus("finishing");
      const remaining = CONFETTI_MS - (performance.now() - burstStarted);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      setStatus("success");
    } catch (error) {
      const err =
        error instanceof RequestError
          ? error
          : new RequestError(error instanceof UploadError ? error.message : "Something went wrong. Please try again.");
      setFormError(err.message);
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      setStatus("idle");
    } finally {
      submittingRef.current = false;
    }
  }

  if (status === "success" && saved) {
    return (
      <div role="status" className="sk sk-outline rounded-[37px] px-6 py-10 text-center sm:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a just-uploaded image */}
        {previewUrl && <img src={previewUrl} alt="" className="mx-auto h-40 w-40 rounded-[26px] object-cover" />}
        <h2 className="mt-6 text-[40px] leading-tight text-heading sm:text-[48px]">Set aside for now</h2>
        <p className="mt-3 text-2xl text-body">
          <span className="text-deep">{saved.name}</span> will be ready for review on{" "}
          <time dateTime={saved.availableAt} className="text-deep">
            {availableFormatter.format(new Date(saved.availableAt))}
          </time>
          . Until then, let it go and see how you feel.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={resetForm}
            className="sk sk-btn flex h-16 items-center rounded-[20px] px-6 text-[30px] text-canvas"
          >
            Add another item
          </button>
          <Link href="/review" className="sk sk-btn-dark flex h-16 items-center rounded-[20px] px-6 text-[30px] text-canvas">
            Go to review
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-7" aria-busy={busy}>
      <div className="mx-auto max-w-[600px]">
        <input
          ref={fileInputRef}
          id={ids.image}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={handleFileChange}
          disabled={busy}
          aria-invalid={!!fieldErrors.image}
          aria-describedby={[`${ids.image}-hint`, fieldErrors.image && `${ids.image}-error`].filter(Boolean).join(" ")}
          className="peer sr-only"
        />
        <label
          htmlFor={ids.image}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="photo-dropzone"
          className={`sk relative flex aspect-[6/5] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[37px] text-center peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-link ${
            dragging ? "sk-dashed-active" : fieldErrors.image ? "sk-dashed [--sk-edge:var(--color-danger)]" : "sk-dashed"
          }`}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: preview URLs can't go through next/image
            <img
              src={previewUrl}
              alt="Preview of the selected photo"
              className="absolute inset-[10px] h-[calc(100%-20px)] w-[calc(100%-20px)] rounded-[28px] object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-4 px-6 sm:gap-6">
              <span className="text-[32px] text-faint sm:text-[40px]">Add a photo</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
              <img src="/figma/photo-icon.svg" alt="" width={168} height={160} className="w-28 sm:w-[154px]" />
              <span className="text-2xl text-faint sm:text-[31px]">Drag and drop or select one</span>
            </span>
          )}
          {dragging && (
            <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-sage-50/90 text-[36px] text-body">
              Drop the photo here
            </span>
          )}
        </label>
        <p id={`${ids.image}-hint`} className="mt-2 pl-2 text-lg text-faint sm:text-[23px]">
          JPEG, PNG, or WebP, up to 5 MB.{file && ` Selected: ${file.name}. Tap or drop another photo to change it.`}
        </p>
        {fieldErrors.image && (
          <p id={`${ids.image}-error`} className="mt-1 pl-2 text-lg text-danger sm:text-xl">
            {fieldErrors.image}
          </p>
        )}
      </div>

      <div className="mx-auto max-w-[626px] space-y-7">
        <TextField
          id={ids.name}
          label="What is it?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={ITEM_NAME_MAX_LENGTH}
          placeholder="e.g Squishies"
          autoComplete="off"
          disabled={busy}
          error={fieldErrors.name}
        />
        <TextField
          id={ids.price}
          label="Price(USD)"
          prefix="$"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          autoComplete="off"
          disabled={busy}
          error={fieldErrors.price}
        />
        <div>
          <TextAreaField
            id={ids.description}
            label={
              <>
                Why do you want it? <span className="text-faint">(optional)</span>
              </>
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={ITEM_DESCRIPTION_MAX_LENGTH}
            placeholder="What made you want this today?"
            disabled={busy}
            error={fieldErrors.description}
          />
          <p className="mt-1 text-right text-lg text-faint sm:text-[23px]" aria-live="polite">
            {description.length}/{ITEM_DESCRIPTION_MAX_LENGTH} characters
          </p>
        </div>

        <FormError message={formError} />

        <div className="flex justify-center pt-2">
          <ConfettiButton type="submit" disabled={busy} burst={burst}>
            {status === "uploading" ? "Uploading…" : status === "saving" ? "Saving…" : "Start the pause"}
          </ConfettiButton>
        </div>
        <p aria-live="polite" className="sr-only">
          {status === "uploading" ? "Uploading photo" : status === "saving" ? "Saving item" : status === "finishing" ? "Saved" : ""}
        </p>
      </div>
    </form>
  );
}
