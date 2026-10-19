"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { ALLOWED_IMAGE_TYPES, ITEM_DESCRIPTION_MAX_LENGTH, ITEM_NAME_MAX_LENGTH } from "@/lib/constants";
import { fieldErrorsOf, itemFieldsSchema, parsePriceInput, validateImageFile } from "@/lib/validations";
import type { ApiErrorBody, CreateItemResponse, UploadSignature } from "@/types/api";
import type { ItemDTO } from "@/types/item";

type Status = "idle" | "uploading" | "saving" | "success";
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

async function uploadToCloudinary(file: File, sig: UploadSignature): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("public_id", sig.publicId);
  form.append("allowed_formats", sig.allowedFormats);
  form.append("signature", sig.signature);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new RequestError("The photo upload failed. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as { public_id?: string; error?: { message?: string } } | null;
  if (!res.ok || !data?.public_id) {
    const detail = data?.error?.message ?? "";
    throw new RequestError(
      /format/i.test(detail)
        ? "Please choose a JPEG, PNG, or WebP image."
        : "The photo upload failed. Please try again.",
    );
  }
  return data.public_id;
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

  const busy = status === "uploading" || status === "saving";

  function replacePreview(next: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = next ? URL.createObjectURL(next) : null;
    setPreviewUrl(previewUrlRef.current);
  }

  // Release the object URL when the form unmounts.
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    const error = next ? validateImageFile(next) : null;
    setFieldErrors((prev) => ({ ...prev, image: error ?? undefined }));
    if (error) {
      setFile(null);
      replacePreview(null);
      e.target.value = "";
      return;
    }
    setFile(next);
    replacePreview(next);
  }

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
      setStatus("success");
    } catch (error) {
      const err = error instanceof RequestError ? error : new RequestError("Something went wrong. Please try again.");
      setFormError(err.message);
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      setStatus("idle");
    } finally {
      submittingRef.current = false;
    }
  }

  if (status === "success" && saved) {
    return (
      <div role="status" className="rounded-3xl border border-sage-100 bg-paper p-8 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a just-uploaded image */}
        {previewUrl && <img src={previewUrl} alt="" className="mx-auto h-40 w-40 rounded-2xl object-cover" />}
        <h2 className="mt-6 font-serif text-2xl font-semibold">Set aside for 24 hours</h2>
        <p className="mt-3 text-ink-muted">
          <span className="font-medium text-ink">{saved.name}</span> will be ready for review on{" "}
          <time dateTime={saved.availableAt} className="font-medium text-ink">
            {availableFormatter.format(new Date(saved.availableAt))}
          </time>
          . Until then, let it go and see how you feel.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700"
          >
            Add another item
          </button>
          <Link href="/review" className="rounded-full border border-sage-200 px-6 py-3 font-medium hover:bg-sage-50">
            Go to review
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = (field: FieldName) =>
    `mt-2 block w-full rounded-2xl border bg-paper px-4 py-3 text-ink placeholder:text-ink-muted/60 ${
      fieldErrors[field] ? "border-red-400" : "border-sage-200"
    }`;
  const describedBy = (field: FieldName) => (fieldErrors[field] ? `${ids[field]}-error` : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-busy={busy}>
      <div>
        <span className="block font-medium">Photo</span>
        <input
          ref={fileInputRef}
          id={ids.image}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={handleFileChange}
          disabled={busy}
          aria-invalid={!!fieldErrors.image}
          aria-describedby={[`${ids.image}-hint`, describedBy("image")].filter(Boolean).join(" ")}
          className="peer sr-only"
        />
        <label
          htmlFor={ids.image}
          className={`mt-2 flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed bg-paper text-center transition-colors hover:bg-sage-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sage-600 sm:aspect-[4/3] ${
            fieldErrors.image ? "border-red-400" : "border-sage-200"
          }`}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: preview URLs can't go through next/image
            <img src={previewUrl} alt="Preview of the selected photo" className="h-full w-full object-cover" />
          ) : (
            <span className="px-6 text-ink-muted">
              <span className="block font-medium text-sage-700">Choose a photo</span>
              <span className="mt-1 block text-sm">Tap to select an image</span>
            </span>
          )}
        </label>
        <p id={`${ids.image}-hint`} className="mt-2 text-sm text-ink-muted">
          JPEG, PNG, or WebP, up to 5 MB.{file && ` Selected: ${file.name}. Tap the photo to change it.`}
        </p>
        {fieldErrors.image && (
          <p id={`${ids.image}-error`} className="mt-1 text-sm text-red-700">
            {fieldErrors.image}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={ids.name} className="block font-medium">
          What is it?
        </label>
        <input
          id={ids.name}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={ITEM_NAME_MAX_LENGTH}
          placeholder="e.g. Linen throw blanket"
          autoComplete="off"
          disabled={busy}
          aria-invalid={!!fieldErrors.name}
          aria-describedby={describedBy("name")}
          className={inputClass("name")}
        />
        {fieldErrors.name && (
          <p id={`${ids.name}-error`} className="mt-1 text-sm text-red-700">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={ids.price} className="block font-medium">
          Price (USD)
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-muted">
            $
          </span>
          <input
            id={ids.price}
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            autoComplete="off"
            disabled={busy}
            aria-invalid={!!fieldErrors.price}
            aria-describedby={describedBy("price")}
            className={`${inputClass("price")} pl-8`}
          />
        </div>
        {fieldErrors.price && (
          <p id={`${ids.price}-error`} className="mt-1 text-sm text-red-700">
            {fieldErrors.price}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={ids.description} className="block font-medium">
          Why do you want it? <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <textarea
          id={ids.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={ITEM_DESCRIPTION_MAX_LENGTH}
          rows={3}
          placeholder="What made you want this today?"
          disabled={busy}
          aria-invalid={!!fieldErrors.description}
          aria-describedby={[`${ids.description}-count`, describedBy("description")].filter(Boolean).join(" ")}
          className={inputClass("description")}
        />
        <p id={`${ids.description}-count`} className="mt-1 text-right text-xs text-ink-muted">
          {description.length}/{ITEM_DESCRIPTION_MAX_LENGTH}
        </p>
        {fieldErrors.description && (
          <p id={`${ids.description}-error`} className="mt-1 text-sm text-red-700">
            {fieldErrors.description}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy && (
          <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {status === "uploading" ? "Uploading photo…" : status === "saving" ? "Saving…" : "Start the 24-hour pause"}
      </button>
      <p aria-live="polite" className="sr-only">
        {status === "uploading" ? "Uploading photo" : status === "saving" ? "Saving item" : ""}
      </p>
    </form>
  );
}
