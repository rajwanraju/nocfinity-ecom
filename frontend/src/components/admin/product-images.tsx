"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { adminRequest } from "@/lib/admin/client";
import type { ProductImage } from "@/lib/api/types";

export function ProductImages({
  productId,
  images,
}: {
  productId: number;
  images: ProductImage[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;

    const file = fileRef.current?.files?.[0];

    if (!file) {
      toast.error("Choose an image first.");
      return;
    }

    const form = new FormData();
    form.append("image", file);

    if (alt.trim()) {
      form.append("alt", alt.trim());
    }

    setPending("upload");

    const result = await adminRequest(`products/${productId}/images`, { form });

    setPending(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    formElement.reset();
    setAlt("");
    toast.success(result.message || "Image uploaded.");
    router.refresh();
  }

  async function setPrimary(imageId: number) {
    setPending(`primary-${imageId}`);
    const result = await adminRequest(`products/${productId}/images/${imageId}`, {
      method: "PATCH",
      body: { is_primary: true },
    });
    setPending(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success("Primary image updated.");
    router.refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= images.length) {
      return;
    }

    const ids = images.map((image) => image.id);
    const [moved] = ids.splice(index, 1);

    if (moved === undefined) {
      return;
    }

    ids.splice(target, 0, moved);
    setPending("reorder");

    const result = await adminRequest(`products/${productId}/images/reorder`, {
      method: "PATCH",
      body: { images: ids },
    });

    setPending(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    router.refresh();
  }

  async function remove(imageId: number) {
    if (!window.confirm("Remove this image? The file is deleted too.")) {
      return;
    }

    setPending(`delete-${imageId}`);
    const result = await adminRequest(`products/${productId}/images/${imageId}`, {
      method: "DELETE",
    });
    setPending(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message || "Image removed.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {images.length === 0 ? (
        <p className="text-sm text-shop-muted">No images yet. Upload one below.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => (
            <li className="rounded-xl border border-shop-line p-3" key={image.id}>
              <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-shop-tile">
                <Image
                  alt={image.alt ?? "Product image"}
                  className="object-cover"
                  fill
                  sizes="240px"
                  src={image.url}
                />
                {image.is_primary ? (
                  <span className="absolute top-2 left-2 rounded-full bg-shop-ink px-2 py-0.5 text-[10px] font-bold tracking-wide text-background uppercase">
                    Primary
                  </span>
                ) : null}
              </div>
              <p className="mt-2 truncate text-xs text-shop-muted">{image.alt ?? "No alt text"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {image.is_primary ? null : (
                  <Button
                    className="h-7 rounded-full px-3 text-xs"
                    disabled={pending !== null}
                    onClick={() => void setPrimary(image.id)}
                    type="button"
                    variant="outline"
                  >
                    Make primary
                  </Button>
                )}
                <Button
                  aria-label="Move image up"
                  className="h-7 w-7 rounded-full p-0"
                  disabled={pending !== null || index === 0}
                  onClick={() => void move(index, -1)}
                  type="button"
                  variant="ghost"
                >
                  ↑
                </Button>
                <Button
                  aria-label="Move image down"
                  className="h-7 w-7 rounded-full p-0"
                  disabled={pending !== null || index === images.length - 1}
                  onClick={() => void move(index, 1)}
                  type="button"
                  variant="ghost"
                >
                  ↓
                </Button>
                <Button
                  className="h-7 rounded-full px-3 text-xs"
                  disabled={pending !== null}
                  onClick={() => void remove(image.id)}
                  type="button"
                  variant="destructive"
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-wrap items-end gap-3 border-t border-shop-line pt-5"
        onSubmit={upload}
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="product-image">
            Image
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
            id="product-image"
            ref={fileRef}
            type="file"
          />
          <p className="text-xs text-shop-muted">JPG, PNG or WebP up to 2 MB.</p>
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="product-image-alt">
            Alt text (optional)
          </label>
          <Input
            className="h-10"
            id="product-image-alt"
            onChange={(event) => setAlt(event.target.value)}
            value={alt}
          />
        </div>
        <Button className="h-10 rounded-full px-5" disabled={pending !== null} type="submit">
          {pending === "upload" ? "Uploading…" : "Upload image"}
        </Button>
      </form>
    </div>
  );
}
