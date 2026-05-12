"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { FileText } from "lucide-react";
import { GlowCard } from "@/components/ui/primitives/glow-card";
import { cn } from "@/lib/utils";

export type SourceItem = {
  source: number;
  chunkId: string;
  documentId: string;
  documentTitle?: string;
  filename?: string;
  content: string;
  similarity: number;
  chunkIndex: number;
};

function similarityBadge(similarity: number) {
  const percentage = Math.round(similarity * 100);
  if (percentage > 90) {
    return {
      text: `${percentage}%`,
      className: "text-[hsl(var(--color-success))] bg-[hsl(var(--color-success)/0.14)] shadow-[0_0_12px_hsl(var(--color-success)/0.25)]",
    };
  }
  if (percentage >= 70) {
    return {
      text: `${percentage}%`,
      className: "text-[hsl(var(--color-accent))] bg-[hsl(var(--color-accent)/0.14)]",
    };
  }
  return {
    text: `${percentage}%`,
    className: "text-[hsl(var(--color-text-tertiary))] bg-[hsl(var(--color-bg-hover))]",
  };
}

export function SourceCard({ source, queryTerms = [] }: { source: SourceItem; queryTerms?: string[] }) {
  const [open, setOpen] = useState(false);
  const badge = similarityBadge(source.similarity);

  const excerpt = queryTerms.reduce((acc, term) => {
    if (!term || term.length < 3) return acc;
    return acc.replace(new RegExp(`(${term})`, "ig"), "<mark>$1</mark>");
  }, source.content);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
      <Drawer.Trigger asChild>
        <button type="button" className="w-[300px] min-w-[300px] text-left">
          <GlowCard className="gradient-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-[hsl(var(--color-text-secondary))]">
                  <FileText className="size-3.5" />
                  <span className="truncate">{source.documentTitle || source.filename || "Document"}</span>
                </div>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 font-mono text-xs", badge.className)}>{badge.text}</span>
            </div>

            <p
              className="mt-3 line-clamp-3 text-sm text-[hsl(var(--color-text-secondary))]"
              dangerouslySetInnerHTML={{ __html: excerpt.replace(/<mark>/g, '<mark class="bg-[hsl(var(--color-accent)/0.15)] rounded px-0.5">') }}
            />

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-mono text-[hsl(var(--color-text-tertiary))]">Chunk #{source.chunkIndex}</span>
              <span className="text-[hsl(var(--color-accent))]">View in document →</span>
            </div>
          </GlowCard>
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content className="fixed right-0 top-0 z-50 h-full w-full max-w-xl border-l border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))] p-6">
          <h4 className="text-lg font-semibold text-[hsl(var(--color-text-primary))]">{source.documentTitle || source.filename || "Source"}</h4>
          <p className="mt-1 text-xs text-[hsl(var(--color-text-tertiary))]">Chunk #{source.chunkIndex}</p>
          <div className="mt-4 rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))] p-4 text-sm text-[hsl(var(--color-text-secondary))]">
            {source.content}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
