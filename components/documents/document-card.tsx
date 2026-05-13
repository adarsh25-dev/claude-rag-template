"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Drawer } from "vaul";
import {
  FileText,
  FileCode2,
  ScrollText,
  FileType2,
  MoreHorizontal,
  Trash2,
  FileSearch,
} from "lucide-react";
import { GlowCard } from "@/components/ui/primitives/glow-card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/database";

type DocumentCardProps = {
  document: Document;
  onDelete: (id: string) => void;
};

const statusStyles: Record<Document["status"], string> = {
  processing:
    "text-[hsl(var(--color-warning))] bg-[hsl(var(--color-warning)/0.14)] shadow-[0_0_16px_hsl(var(--color-warning)/0.2)]",
  ready:
    "text-[hsl(var(--color-success))] bg-[hsl(var(--color-success)/0.14)] shadow-[0_0_16px_hsl(var(--color-success)/0.2)]",
  failed:
    "text-[hsl(var(--color-danger))] bg-[hsl(var(--color-danger)/0.14)] shadow-[0_0_16px_hsl(var(--color-danger)/0.2)]",
};

function statusBadgeClass(status: Document["status"]): string {
  return statusStyles[status] ?? statusStyles.failed;
}

function FileIcon({ type }: { type: string }) {
  if (type.includes("pdf")) return <FileText className="size-5 text-[hsl(var(--color-warning))]" />;
  if (type.includes("word")) return <FileType2 className="size-5 text-[hsl(var(--color-accent))]" />;
  if (type.includes("markdown")) return <FileCode2 className="size-5 text-[hsl(var(--color-accent))]" />;
  return <ScrollText className="size-5 text-[hsl(var(--color-text-secondary))]" />;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const [open, setOpen] = useState(false);
  const metadata = document.metadata as { chunk_count?: number; progress?: { stage?: string; current?: number; total?: number } };
  const chunkCount = metadata?.chunk_count ?? 0;
  const statusText = useMemo(() => {
    if (document.status === "processing") return "Indexing…";
    if (document.status === "ready") return "Ready";
    if (document.status === "failed") return "Not indexed";
    return "Unknown status";
  }, [document.status]);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="right">
      <Drawer.Trigger asChild>
        <button type="button" className="w-full text-left">
          <GlowCard className="rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_18px_40px_-30px_hsl(var(--color-accent-glow))]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileIcon type={document.file_type} />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-transparent text-[hsl(var(--color-text-secondary))] transition-colors hover:bg-[hsl(var(--color-bg-hover))]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-[hsl(var(--color-danger))]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(document.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4">
              <h3 className="line-clamp-1 text-base font-medium text-[hsl(var(--color-text-primary))]">{document.title}</h3>
              <p className="mt-1 line-clamp-1 font-mono text-xs text-[hsl(var(--color-text-tertiary))]">{document.filename}</p>
            </div>

            <div className="mt-4 space-y-1">
              <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs", statusBadgeClass(document.status))}>
                {statusText}
              </span>
              {document.status === "failed" && document.error_message ? (
                <p className="line-clamp-2 text-xs text-[hsl(var(--color-text-tertiary))]" title={document.error_message}>
                  {document.error_message}
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-[hsl(var(--color-text-secondary))]">
              <span>{chunkCount} chunks</span>
              <span>{formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}</span>
            </div>
          </GlowCard>
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content className="fixed right-0 top-0 z-50 h-full w-full max-w-lg border-l border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))] p-6">
          <div className="mx-auto max-w-md">
            <h4 className="text-lg font-semibold text-[hsl(var(--color-text-primary))]">Chunk preview</h4>
            <p className="mt-1 text-sm text-[hsl(var(--color-text-secondary))]">
              Preview for <span className="font-mono text-[hsl(var(--color-text-primary))]">{document.filename}</span>
            </p>
            <div className="mt-6 rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))] p-4">
              <div className="flex items-center gap-2 text-[hsl(var(--color-text-secondary))]">
                <FileSearch className="size-4" />
                Chunk explorer will be connected in chat phase.
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
