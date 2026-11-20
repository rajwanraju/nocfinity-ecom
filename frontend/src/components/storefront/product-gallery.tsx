"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/api/types";

type ProductGalleryProps = {
  images: ProductImage[];
  name: string;
};

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  if (!active) {
    return (
      <div className="grid aspect-square place-items-center rounded-[24px] bg-shop-tile text-sm text-shop-muted">
        No image available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-[24px] bg-shop-tile">
        <Image
          alt={active.alt ?? name}
          className="object-contain p-3"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          src={active.url}
        />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                aria-label={`Show image ${index + 1}`}
                aria-pressed={index === activeIndex}
                className="relative size-16 overflow-hidden rounded-xl bg-shop-tile ring-1 ring-shop-line aria-pressed:ring-2 aria-pressed:ring-shop-ink"
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <Image alt="" className="object-cover" fill sizes="64px" src={image.url} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
