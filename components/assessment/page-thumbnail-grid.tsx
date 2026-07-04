"use client";

import Image from "next/image";
import { Plus, X, Check } from "lucide-react";
import { useTranslations } from "next-intl";

export default function PageThumbnailGrid({
  pages,
  onAdd,
  onRemove,
  labelPrefix = "P",
}: {
  pages: string[];
  onAdd?: (dataUrl: string) => void;
  onRemove: (index: number) => void;
  labelPrefix?: string;
}) {
  const t = useTranslations();

  function handleAddFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onAdd) return;
    const reader = new FileReader();
    reader.onload = () => onAdd(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {pages.map((page, index) => (
        <div
          key={index}
          className="relative aspect-3/4 rounded-lg overflow-hidden border border-border group"
        >
          <Image
            src={page}
            alt={`${labelPrefix}${index + 1}`}
            fill
            className="object-cover"
          />
          <span className="absolute top-1 left-1 flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white">
            <Check className="w-3 h-3" />
          </span>
          <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
            {labelPrefix}
            {index + 1}
          </span>
          <button
            onClick={() => onRemove(index)}
            className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Remove ${labelPrefix}${index + 1}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {onAdd && (
        <label className="aspect-3/4 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground cursor-pointer hover:bg-muted transition-colors">
          <Plus className="w-5 h-5" />
          <span className="text-xs font-medium">{t("common.add")}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleAddFile}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
