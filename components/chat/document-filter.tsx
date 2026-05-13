"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, FileText, FileType2, FileCode2, ScrollText } from "lucide-react";
import { motionTapScale } from "@/lib/motion-ui";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/database";

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const checkSpring = { type: "spring" as const, stiffness: 420, damping: 22, mass: 0.6 };

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

function RowCheck({
  visible,
  reduceMotion,
}: {
  visible: boolean;
  reduceMotion: boolean | null;
}) {
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      <AnimatePresence initial={false}>
        {visible ? (
          <motion.span
            key="check"
            initial={
              reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
            }
            animate={{ scale: 1, opacity: 1 }}
            exit={
              reduceMotion ? { scale: 1, opacity: 0 } : { scale: 0, opacity: 0 }
            }
            transition={
              reduceMotion
                ? { duration: 0.12, ease: easeOutExpo }
                : checkSpring
            }
            className="absolute inset-0 flex items-center justify-center"
          >
            <Check className="size-4" aria-hidden />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

export function DocumentFilter({
  documents,
  selectedIds,
  onToggle,
  onToggleAll,
  onClear,
}: Props) {
  const reduceMotion = useReducedMotion();
  // "All documents" is an exclusive mode: active only when no specific docs are selected.
  const allActive = selectedIds.length === 0;
  const hasSelection = selectedIds.length > 0;

  return (
    <aside className="sticky top-6 h-fit space-y-3 rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.7] p-4">
      <div className="flex items-center justify-between gap-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={hasSelection ? "corpus-filtered" : "corpus-default"}
            initial={
              reduceMotion ? false : { opacity: 0, y: 6 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduceMotion ? undefined : { opacity: 0, y: -6 }
            }
            transition={{
              duration: reduceMotion ? 0 : 0.24,
              ease: easeOutExpo,
            }}
            className="min-w-0"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--color-text-tertiary))]">
              Corpus
            </p>
            <h3 className="font-display text-sm font-medium tracking-tight text-[hsl(var(--color-text-primary))]">
              {hasSelection
                ? `${selectedIds.length} document${selectedIds.length === 1 ? "" : "s"} in scope`
                : "Filter by document"}
            </h3>
          </motion.div>
        </AnimatePresence>
        <span className="shrink-0 rounded-full border border-[hsl(var(--color-border-strong))] px-2 py-0.5 text-xs text-[hsl(var(--color-text-secondary))]">
          {documents.length}
        </span>
      </div>

      <motion.button
        type="button"
        layout={!reduceMotion}
        layoutDependency={allActive}
        whileTap={motionTapScale(reduceMotion)}
        onClick={onToggleAll}
        aria-pressed={allActive}
        transition={{
          layout: {
            duration: reduceMotion ? 0 : 0.28,
            ease: easeOutExpo,
          },
        }}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--color-bg))]",
          allActive
            ? "gradient-border border-[hsl(var(--color-accent)/0.6)] bg-[hsl(var(--color-accent)/0.08)]"
            : "border-[hsl(var(--color-border-strong))] hover:bg-[hsl(var(--color-bg-hover))]",
        )}
      >
        <span className="text-sm text-[hsl(var(--color-text-primary))]">
          All documents
        </span>
        <RowCheck visible={allActive} reduceMotion={reduceMotion} />
      </motion.button>

      <div className="space-y-2">
        {documents.map((document) => {
          const active = selectedIds.includes(document.id);
          return (
            <motion.button
              key={document.id}
              type="button"
              layout={!reduceMotion}
              layoutDependency={active}
              whileTap={motionTapScale(reduceMotion)}
              onClick={() => onToggle(document.id)}
              aria-pressed={active}
              transition={{
                layout: {
                  duration: reduceMotion ? 0 : 0.28,
                  ease: easeOutExpo,
                },
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--color-bg))]",
                active
                  ? "gradient-border border-[hsl(var(--color-accent)/0.6)] bg-[hsl(var(--color-accent)/0.08)]"
                  : "border-[hsl(var(--color-border-strong))] hover:bg-[hsl(var(--color-bg-hover))]",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon type={document.file_type} />
                <span className="truncate text-sm text-[hsl(var(--color-text-secondary))]">
                  {document.title}
                </span>
              </span>
              <RowCheck visible={active} reduceMotion={reduceMotion} />
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {hasSelection ? (
          <motion.div
            key="clear-row"
            initial={
              reduceMotion ? false : { opacity: 0, y: 4 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduceMotion ? undefined : { opacity: 0, y: 4 }
            }
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              ease: easeOutExpo,
            }}
          >
            <motion.button
              type="button"
              onClick={onClear}
              whileTap={motionTapScale(reduceMotion)}
              className="text-xs text-[hsl(var(--color-text-secondary))] transition-colors hover:text-[hsl(var(--color-text-primary))]"
            >
              Clear all
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
