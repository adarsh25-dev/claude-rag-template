"use client";

import { Check, FileText, FileType2, FileCode2, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/database";

type Props = {
  documents: Document[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onClear: () => void;
};

function Icon({ type }: { type: string }) {
  if (type.includes("pdf")) return <FileText className="size-4" />;
  if (type.includes("word")) return <FileType2 className="size-4" />;
  if (type.includes("markdown")) return <FileCode2 className="size-4" />;
  return <ScrollText className="size-4" />;
}

export function DocumentFilter({ documents, selectedIds, onToggle, onToggleAll, onClear }: Props) {
  const allActive = selectedIds.length === 0 || selectedIds.length === documents.length;

  return (
    <aside className="sticky top-6 h-fit space-y-3 rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.7] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[hsl(var(--color-text-primary))]">Filter by document</h3>
        <span className="rounded-full border border-[hsl(var(--color-border-strong))] px-2 py-0.5 text-xs text-[hsl(var(--color-text-secondary))]">
          {documents.length}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggleAll}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all",
          allActive
            ? "gradient-border border-[hsl(var(--color-accent)/0.6)] bg-[hsl(var(--color-accent)/0.08)]"
            : "border-[hsl(var(--color-border-strong))] hover:bg-[hsl(var(--color-bg-hover))]"
        )}
      >
        <span className="text-sm text-[hsl(var(--color-text-primary))]">All documents</span>
        <Check className={cn("size-4 transition-all", allActive ? "scale-100 opacity-100" : "scale-75 opacity-0")} />
      </button>

      <div className="space-y-2">
        {documents.map((document) => {
          const active = selectedIds.includes(document.id);
          return (
            <button
              key={document.id}
              type="button"
              onClick={() => onToggle(document.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all",
                active
                  ? "gradient-border border-[hsl(var(--color-accent)/0.6)] bg-[hsl(var(--color-accent)/0.08)]"
                  : "border-[hsl(var(--color-border-strong))] hover:bg-[hsl(var(--color-bg-hover))]"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon type={document.file_type} />
                <span className="truncate text-sm text-[hsl(var(--color-text-secondary))]">{document.title}</span>
              </span>
              <Check className={cn("size-4 transition-all", active ? "scale-100 opacity-100" : "scale-75 opacity-0")} />
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 ? (
        <button type="button" onClick={onClear} className="text-xs text-[hsl(var(--color-text-secondary))] hover:text-[hsl(var(--color-text-primary))]">
          Clear all
        </button>
      ) : null}
    </aside>
  );
}
