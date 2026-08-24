"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/validation";

export function ImagePicker({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [files],
  );

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  function add(list: FileList | null) {
    if (!list) return;
    const accepted = Array.from(list).filter(
      (f) => ACCEPTED_IMAGE_TYPES.includes(f.type) && f.size <= MAX_IMAGE_BYTES,
    );
    onChange([...files, ...accepted]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => add(e.target.files)}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-fit"
      >
        <ImagePlus />
        Photo
      </Button>

      {previews.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {previews.map((p, i) => (
            <div
              key={p.url}
              className="relative size-20 overflow-hidden rounded-lg border border-border"
            >
              <Image
                src={p.url}
                alt={p.file.name}
                fill
                unoptimized
                sizes="80px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                disabled={disabled}
                aria-label={`Remove ${p.file.name}`}
                className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white transition hover:bg-black/85"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
