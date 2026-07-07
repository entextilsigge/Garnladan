"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductImage } from "@/lib/products";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Filformatet stöds inte. Ladda upp PNG, JPG eller WebP.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Filen är för stor. Max 8 MB per bild.";
  }
  return null;
}

// Bilduppladdning per produkt (Vercel Blob) — hanterar sitt eget API-anrop
// oberoende av det stora produktformuläret, så en uppladdning/radering slår
// igenom direkt utan att admin behöver spara hela formuläret.
export default function ProductImages({
  productId,
  initialImages,
}: {
  productId: string;
  initialImages: ProductImage[];
}) {
  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    for (const file of Array.from(files)) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/admin/products/${productId}/images`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "Kunde inte ladda upp bilden.");
          continue;
        }
        setImages(data.product.images ?? []);
      } catch {
        setError("Kunde inte ladda upp bilden. Försök igen.");
      } finally {
        setUploading(false);
      }
    }
  }

  async function reorder(nextOrder: ProductImage[]) {
    setImages(nextOrder);
    setError(null);
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: nextOrder.map((img) => img.id) }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Kunde inte ändra bildordningen.");
      setImages(images); // återställ vid fel
      return;
    }
    setImages(data.product.images ?? []);
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    reorder(next);
  }

  function makeMain(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [img] = next.splice(index, 1);
    next.unshift(img);
    reorder(next);
  }

  async function removeImage(imageId: string) {
    if (!confirm("Ta bort bilden? Den raderas permanent från lagringen.")) return;
    setBusyId(imageId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Kunde inte ta bort bilden.");
        return;
      }
      setImages(data.product.images ?? []);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-kol">Produktbilder</label>
      <p className="mb-2 text-xs text-mull">
        Ladda upp riktiga foton (PNG med transparens, JPG eller WebP, max 8 MB).
        Första bilden är huvudbild och visas i produktkort och produktlista.
        Utan uppladdad bild visas den genererade illustrationen som idag.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
          dragOver ? "border-tegel bg-tegel/5" : "border-kol/20 hover:border-kol/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="font-medium text-kol">
          {uploading ? "Laddar upp…" : "Släpp bilder här eller klicka för att välja"}
        </p>
        <p className="mt-0.5 text-xs text-mull">PNG, JPG eller WebP · max 8 MB</p>
      </div>

      {error && (
        <p className="mt-2 rounded-xl bg-tegel/10 px-4 py-2.5 text-xs font-medium text-tegel-dark">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, i) => (
            <div key={img.id} className="relative overflow-hidden rounded-xl ring-1 ring-kol/10">
              <div className="relative aspect-square bg-linne/40">
                <Image src={img.url} alt="" fill sizes="200px" className="object-cover" />
              </div>
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-tegel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-krita">
                  Huvudbild
                </span>
              )}
              <div className="flex items-center justify-between gap-1 bg-white/90 p-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0}
                    title="Flytta tidigare"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-kol hover:bg-linne disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(i, 1)}
                    disabled={i === images.length - 1}
                    title="Flytta senare"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-kol hover:bg-linne disabled:opacity-30"
                  >
                    ↓
                  </button>
                  {i !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeMain(i)}
                      title="Gör till huvudbild"
                      className="flex h-6 items-center justify-center rounded-md px-1.5 text-[10px] font-medium text-kol hover:bg-linne"
                    >
                      Gör till huvudbild
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  disabled={busyId === img.id}
                  title="Ta bort bild"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-tegel hover:bg-tegel/10 disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
