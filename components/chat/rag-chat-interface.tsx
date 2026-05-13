"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import useSWR from "swr";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Drawer } from "vaul";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Copy,
  RotateCcw,
  Send,
  Square,
  FileX,
  ListFilter,
  Library,
  AlertCircle,
  Mic,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { ShimmerText } from "@/components/ui/primitives/shimmer-text";
import { GlowCard } from "@/components/ui/primitives/glow-card";
import { MagneticButton } from "@/components/ui/primitives/magnetic-button";
import { ComposerWaveBackdrop } from "@/components/chat/composer-wave-backdrop";
import { DocumentFilter } from "@/components/chat/document-filter";
import { SourceCard, type SourceItem } from "@/components/chat/source-card";
import { motionTapScale } from "@/lib/motion-ui";
import {
  ragDrawerOverlayClassName,
  ragDrawerSheetClassName,
} from "@/lib/rag-drawer-ui";
import { cn } from "@/lib/utils";
import type { Document } from "@/types/database";

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const mobileDrawerSheetSpring = {
  type: "spring" as const,
  damping: 25,
  stiffness: 200,
};

/** Matches Tailwind `max-h-48` (12rem) for composer auto-grow cap. */
const COMPOSER_TEXTAREA_MAX_PX = 192;

const EMPTY_HERO_TITLE = "Ask anything about your documents.";

const CHAT_MARKDOWN_COMPONENTS: Partial<Components> = {
  p: ({ children }) => (
    <p className="mb-3 text-[hsl(var(--color-text-secondary))] last:mb-0 leading-relaxed">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-5 text-[hsl(var(--color-text-secondary))]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-5 text-[hsl(var(--color-text-secondary))]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed marker:text-[hsl(var(--color-accent))]">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-[3px] border-[hsl(var(--color-accent)/0.45)] bg-[hsl(var(--color-text-primary)/0.04)] py-2 pl-4 pr-3 text-[hsl(var(--color-text-secondary))] italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-6 border-0 border-t border-[hsl(var(--color-border-strong))]" />
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[hsl(var(--color-text-primary))]">
      {children}
    </strong>
  ),
  h1: ({ children }) => (
    <h1 className="font-display text-2xl text-[hsl(var(--color-text-primary))]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display text-xl text-[hsl(var(--color-text-primary))]">
      {children}
    </h2>
  ),
  a: ({ children, ...props }) => (
    <a
      {...props}
      className="text-[hsl(var(--color-accent))] underline-offset-2 transition-colors hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) =>
    className?.includes("language-") ? (
      <pre className="overflow-x-auto rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))] p-3 font-mono text-sm">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="rounded bg-[hsl(var(--color-text-primary)/0.08)] px-1.5 py-0.5 font-mono text-[0.9em]">
        {children}
      </code>
    ),
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Request failed");
  return response.json() as Promise<T>;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--color-bg))]";

const modelChipLabel =
  typeof process.env.NEXT_PUBLIC_CHAT_MODEL_LABEL === "string" &&
  process.env.NEXT_PUBLIC_CHAT_MODEL_LABEL.trim()
    ? process.env.NEXT_PUBLIC_CHAT_MODEL_LABEL.trim()
    : "Configured model";

function DocumentsSidebarSkeleton() {
  return (
    <aside className="sticky top-6 h-fit space-y-3 rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.7] p-4">
      <div className="h-4 w-32 animate-shimmer rounded bg-[hsl(var(--color-text-primary)/0.06)]" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-shimmer rounded-lg bg-[hsl(var(--color-text-primary)/0.05)]"
          />
        ))}
      </div>
    </aside>
  );
}

export function RagChatInterface() {
  const reduceMotion = useReducedMotion();
  const { data, error, isLoading, mutate } = useSWR<{ documents: Document[] }>(
    "/api/documents",
    fetcher,
  );
  const documents = useMemo(() => data?.documents ?? [], [data?.documents]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [sourcesByMessage, setSourcesByMessage] = useState<
    Record<string, SourceItem[]>
  >({});
  const [inputDraft, setInputDraft] = useState("");
  const [showSourcesRail, setShowSourcesRail] = useState(false);
  const [retrievalStatus, setRetrievalStatus] = useState<string | null>(null);
  const pendingSourcesRef = useRef<SourceItem[]>([]);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [sourcesDrawerOpen, setSourcesDrawerOpen] = useState(false);
  /** Normalized pointer within the main chat card (0–1); canvas reads for VFX only. */
  const composerSurfaceMouseRef = useRef({ nx: 0.5, ny: 0.58 });

  const { messages, status, stop, append, reload } = useChat({
    api: "/api/chat",
    body: {
      documentIds: selectedDocumentIds,
    },
    onResponse: (response) => {
      setRetrievalStatus(
        `Reading ${response.headers.get("x-rag-source-count") ?? 0} sources`,
      );
      const encoded = response.headers.get("x-rag-sources");
      let next: SourceItem[] = [];
      if (encoded) {
        try {
          next = JSON.parse(decodeURIComponent(encoded)) as SourceItem[];
        } catch {
          next = [];
        }
      }
      pendingSourcesRef.current = next;
      setShowSourcesRail(next.length > 0);
      setTimeout(() => setRetrievalStatus(null), 800);
    },
    onFinish: (message) => {
      if (pendingSourcesRef.current.length > 0) {
        setSourcesByMessage((prev) => ({
          ...prev,
          [message.id]: pendingSourcesRef.current,
        }));
      }
    },
    onError: (err) => {
      toast.error(err.message || "Chat request failed.");
    },
  });

  const isStreaming = status === "streaming";

  const sendComposerMessage = useCallback(() => {
    if (isStreaming) return;
    const text = inputDraft.trim();
    if (!text) return;

    setRetrievalStatus(
      `Searching ${selectedDocumentIds.length || documents.length || 0} documents…`,
    );
    void append(
      { role: "user", content: text },
      {
        body: {
          documentIds: selectedDocumentIds,
        },
      },
    );
    setInputDraft("");
  }, [append, documents.length, inputDraft, isStreaming, selectedDocumentIds]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendComposerMessage();
  };

  const onTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendComposerMessage();
  };

  const queryTerms = useMemo(
    () => inputDraft.split(/\s+/).filter((word) => word.length > 2),
    [inputDraft],
  );

  const suggestedPrompts = useMemo(() => {
    const title = documents[0]?.title ?? "this document";
    return [
      `Summarize ${title}`,
      "What are the key takeaways?",
      "Find sections about timeline and milestones",
      "List the action items",
    ];
  }, [documents]);

  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const latestSources = latestAssistant
    ? (sourcesByMessage[latestAssistant.id] ?? [])
    : [];

  const lastMessageSignature = useMemo(() => {
    const last = messages.at(-1);
    if (!last) return "";
    return `${last.id}:${last.content.length}:${last.role}`;
  }, [messages]);

  const scrollTranscriptToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      const root = transcriptScrollRef.current;
      if (!root) return;
      root.scrollTo({ top: root.scrollHeight, behavior });
    },
    [],
  );

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const behavior: ScrollBehavior =
      reduced || status === "streaming" ? "auto" : "smooth";
    scrollTranscriptToBottom(behavior);
    if (status !== "streaming" || reduced) return;
    const id = requestAnimationFrame(() => {
      scrollTranscriptToBottom("auto");
    });
    return () => cancelAnimationFrame(id);
  }, [lastMessageSignature, messages.length, scrollTranscriptToBottom, status]);

  const copyAssistantMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const documentFilterProps = {
    documents,
    selectedIds: selectedDocumentIds,
    onToggle: (id: string) =>
      setSelectedDocumentIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      ),
    onToggleAll: () => setSelectedDocumentIds([]),
    onClear: () => setSelectedDocumentIds([]),
  };

  const emptyStateDocuments = !isLoading && !error && documents.length === 0;
  const emptyStateReady = !isLoading && !error && documents.length > 0;
  const documentsLoadError = Boolean(error);

  useEffect(() => {
    if (messages.length > 0) {
      setEmptyHeroTypeIndex(0);
      return;
    }
    if (!emptyStateReady || documentsLoadError || isLoading || emptyStateDocuments) {
      setEmptyHeroTypeIndex(0);
      return;
    }
    if (reduceMotion) {
      setEmptyHeroTypeIndex(EMPTY_HERO_TITLE.length);
      return;
    }
    setEmptyHeroTypeIndex(0);
    const baseDelayMs = 200;
    const perCharMs = 34;
    const timeouts: number[] = [];
    for (let i = 1; i <= EMPTY_HERO_TITLE.length; i += 1) {
      timeouts.push(
        window.setTimeout(() => {
          setEmptyHeroTypeIndex(i);
        }, baseDelayMs + i * perCharMs),
      );
    }
    return () => {
      for (const id of timeouts) {
        window.clearTimeout(id);
      }
    };
  }, [
    messages.length,
    emptyStateReady,
    documentsLoadError,
    isLoading,
    emptyStateDocuments,
    reduceMotion,
  ]);

  /** Which assistant bubble shows the floating action bar (UI only). */
  const [hoveredAssistantId, setHoveredAssistantId] = useState<string | null>(
    null,
  );
  const [composerFocused, setComposerFocused] = useState(false);
  const [emptyHeroTypeIndex, setEmptyHeroTypeIndex] = useState(0);

  const userMessageSpring = useMemo(
    () =>
      reduceMotion
        ? { type: "tween" as const, duration: 0 }
        : { type: "spring" as const, stiffness: 260, damping: 20, mass: 0.85 },
    [reduceMotion],
  );

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(
      Math.max(el.scrollHeight, 48),
      COMPOSER_TEXTAREA_MAX_PX,
    );
    el.style.height = `${next}px`;
  }, [inputDraft, isStreaming]);

  const canSendComposer = Boolean(inputDraft.trim()) && !isStreaming;

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key="rag-chat-interface"
        className="relative isolate flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: reduceMotion ? 0 : 0.72,
          ease: easeOutExpo,
        }}
      >
        {/* Premium mesh: intensity follows streaming (CSS vars only). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-[hsl(var(--color-bg))]"
          style={
            {
              "--chat-mesh-a": isStreaming ? "0.13" : "0.065",
              "--chat-mesh-b": isStreaming ? "0.11" : "0.048",
              "--chat-mesh-c": isStreaming ? "0.09" : "0.045",
              background: `
                radial-gradient(ellipse 85% 70% at 12% 8%, hsl(var(--color-accent, 206 48% 58%) / var(--chat-mesh-a, 0.065)), transparent 58%),
                radial-gradient(ellipse 75% 65% at 92% 18%, hsl(var(--color-accent-2, 218 32% 38%) / var(--chat-mesh-b, 0.048)), transparent 52%),
                radial-gradient(ellipse 120% 90% at 50% 108%, hsl(var(--color-accent, 206 48% 58%) / var(--chat-mesh-c, 0.045)), transparent 48%),
                radial-gradient(ellipse 55% 45% at 70% 72%, hsl(var(--color-text-primary, 210 28% 90%) / 0.035), transparent 62%),
                hsl(var(--color-bg, 0 0% 4%))
              `,
            } as CSSProperties
          }
        />
        <div className="relative z-10 flex h-[calc(100dvh-4.75rem)] min-h-0 w-full flex-col overflow-hidden lg:h-[calc(100vh-4.75rem)]">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[min(100%,96rem)] flex-1 items-stretch gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:gap-6">
        <div className="hidden min-h-0 w-[220px] shrink-0 lg:block lg:h-full xl:w-[240px]">
          {isLoading ? (
            <DocumentsSidebarSkeleton />
          ) : (
            <DocumentFilter {...documentFilterProps} />
          )}
        </div>

          <div
            className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3"
            onMouseMove={(e) => {
              const el = e.currentTarget;
              const r = el.getBoundingClientRect();
              if (r.width < 1 || r.height < 1) return;
              composerSurfaceMouseRef.current = {
                nx: (e.clientX - r.left) / r.width,
                ny: (e.clientY - r.top) / r.height,
              };
            }}
          >
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            <Drawer.Root
              open={filterDrawerOpen}
              onOpenChange={setFilterDrawerOpen}
            >
              <Drawer.Trigger asChild>
                <motion.button
                  type="button"
                  whileTap={motionTapScale(reduceMotion)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay,220_14%_9%)_/_0.75)] px-3 py-2 text-xs text-[hsl(var(--color-text-primary))]",
                    focusRing,
                  )}
                  aria-label="Open document filter"
                >
                  <ListFilter
                    className="size-4 text-[hsl(var(--color-accent))]"
                    aria-hidden
                  />
                  Documents
                  <span className="rounded-full border border-[hsl(var(--color-border-strong))] px-1.5 py-0.5 text-[hsl(var(--color-text-tertiary))]">
                    {selectedDocumentIds.length || documents.length}
                  </span>
                </motion.button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay asChild>
                  {reduceMotion ? (
                    <div className={ragDrawerOverlayClassName} />
                  ) : (
                    <motion.div
                      className={ragDrawerOverlayClassName}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: filterDrawerOpen ? 1 : 0 }}
                      transition={{ duration: 0.32, ease: easeOutExpo }}
                    />
                  )}
                </Drawer.Overlay>
                <Drawer.Content
                  className={cn(
                    "fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col outline-none",
                    ragDrawerSheetClassName,
                    "px-4 pb-6 pt-2",
                  )}
                >
                  <motion.div
                    className="flex min-h-0 flex-1 flex-col"
                    initial={reduceMotion ? false : { y: 56, opacity: 0.96 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : mobileDrawerSheetSpring
                    }
                  >
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[hsl(var(--color-border-strong))]" />
                    <h3 className="font-display text-lg tracking-tight text-[hsl(var(--color-text-primary))]">
                      Documents
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--color-text-tertiary))]">
                      Choose which volumes to search before you send a message.
                    </p>
                    <motion.div
                      className="mt-4 max-h-[55vh] min-h-0 overflow-y-auto"
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        delay: reduceMotion ? 0 : 0.1,
                        duration: reduceMotion ? 0 : 0.22,
                        ease: easeOutExpo,
                      }}
                    >
                      {isLoading ? (
                        <p className="py-6 text-center text-sm text-[hsl(var(--color-text-secondary))]">
                          Loading documents…
                        </p>
                      ) : (
                        <DocumentFilter {...documentFilterProps} />
                      )}
                    </motion.div>
                  </motion.div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>

            {showSourcesRail && latestSources.length > 0 ? (
              <Drawer.Root
                open={sourcesDrawerOpen}
                onOpenChange={setSourcesDrawerOpen}
              >
                <Drawer.Trigger asChild>
                  <motion.button
                    type="button"
                    whileTap={motionTapScale(reduceMotion)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay,220_14%_9%)_/_0.75)] px-3 py-2 text-xs text-[hsl(var(--color-text-primary))] xl:hidden",
                      focusRing,
                    )}
                    aria-label="Open latest sources"
                  >
                    <Library
                      className="size-4 text-[hsl(var(--color-accent))]"
                      aria-hidden
                    />
                    Sources
                    <span className="rounded-full border border-[hsl(var(--color-border-strong))] px-1.5 py-0.5 text-[hsl(var(--color-text-tertiary))]">
                      {latestSources.length}
                    </span>
                  </motion.button>
                </Drawer.Trigger>
                <Drawer.Portal>
                  <Drawer.Overlay asChild>
                    {reduceMotion ? (
                      <div className={ragDrawerOverlayClassName} />
                    ) : (
                      <motion.div
                        className={ragDrawerOverlayClassName}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: sourcesDrawerOpen ? 1 : 0 }}
                        transition={{ duration: 0.32, ease: easeOutExpo }}
                      />
                    )}
                  </Drawer.Overlay>
                  <Drawer.Content
                    className={cn(
                      "fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col outline-none xl:hidden",
                      ragDrawerSheetClassName,
                      "px-4 pb-6 pt-2",
                    )}
                  >
                    <motion.div
                      className="flex min-h-0 flex-1 flex-col"
                      initial={reduceMotion ? false : { y: 56, opacity: 0.96 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : mobileDrawerSheetSpring
                      }
                    >
                      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[hsl(var(--color-border-strong))]" />
                      <h3 className="font-display text-lg tracking-tight text-[hsl(var(--color-text-primary))]">
                        Latest sources
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--color-text-tertiary))]">
                        Passages retrieved for your last reply.
                      </p>
                      <motion.div
                        className="mt-4 max-h-[58vh] min-h-0 space-y-3 overflow-y-auto"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          delay: reduceMotion ? 0 : 0.1,
                          duration: reduceMotion ? 0 : 0.22,
                          ease: easeOutExpo,
                        }}
                      >
                        {latestSources.map((source, index) =>
                          reduceMotion ? (
                            <div key={`drawer-${source.chunkId}`}>
                              <SourceCard
                                source={source}
                                queryTerms={queryTerms}
                                variant="rail"
                              />
                            </div>
                          ) : (
                            <motion.div
                              key={`drawer-${source.chunkId}`}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.22,
                                ease: easeOutExpo,
                                delay: index * 0.05,
                              }}
                            >
                              <SourceCard
                                source={source}
                                queryTerms={queryTerms}
                                variant="rail"
                              />
                            </motion.div>
                          ),
                        )}
                      </motion.div>
                    </motion.div>
                  </Drawer.Content>
                </Drawer.Portal>
              </Drawer.Root>
            ) : null}
          </div>

          <header className="shrink-0 px-1">
            <h1 className="font-display text-xl tracking-tight text-[hsl(var(--color-text-primary))] sm:text-2xl">
              Reading room
            </h1>
            <p className="mt-0.5 text-xs text-[hsl(var(--color-text-tertiary))]">
              Grounded replies from your archive
            </p>
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.5]">
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.08]" />
            <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div
                ref={transcriptScrollRef}
                className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-44 pt-7 sm:px-6 sm:pb-52 sm:pt-8 [-webkit-overflow-scrolling:touch]"
                data-lenis-prevent
              >
                {messages.length === 0 ? (
                  <div className="mx-auto mt-10 max-w-xl text-center sm:mt-14">
                    {isLoading ? (
                      <div className="space-y-4">
                        <div className="mx-auto h-12 w-12 animate-shimmer rounded-full bg-[hsl(var(--color-text-primary)/0.08)]" />
                        <div className="mx-auto h-8 max-w-md animate-shimmer rounded bg-[hsl(var(--color-text-primary)/0.06)]" />
                        <div className="mx-auto h-4 max-w-sm animate-shimmer rounded bg-[hsl(var(--color-text-primary)/0.05)]" />
                      </div>
                    ) : documentsLoadError ? (
                      <div className="space-y-4">
                        <AlertCircle
                          className="mx-auto size-10 text-[hsl(var(--color-warning))]"
                          aria-hidden
                        />
                        <h2 className="text-xl font-semibold text-[hsl(var(--color-text-primary))]">
                          Could not load documents
                        </h2>
                        <p className="text-[hsl(var(--color-text-secondary))]">
                          Check your connection and try again.
                        </p>
                        <motion.button
                          type="button"
                          onClick={() => void mutate()}
                          whileTap={motionTapScale(reduceMotion)}
                          className={cn(
                            "rounded-full border border-[hsl(var(--color-border-strong))] px-4 py-2 text-sm text-[hsl(var(--color-text-primary))] hover:bg-[hsl(var(--color-bg-hover))]",
                            focusRing,
                          )}
                        >
                          Retry
                        </motion.button>
                      </div>
                    ) : emptyStateDocuments ? (
                      <div className="space-y-4">
                        <FileX
                          className="mx-auto size-10 text-[hsl(var(--color-text-tertiary))]"
                          aria-hidden
                        />
                        <h2 className="text-2xl font-semibold text-[hsl(var(--color-text-primary))]">
                          No documents yet
                        </h2>
                        <p className="text-[hsl(var(--color-text-secondary))]">
                          Upload your first document to start chatting.
                        </p>
                        <MagneticButton href="/upload" variant="primary">
                          Upload your first document
                        </MagneticButton>
                      </div>
                    ) : emptyStateReady ? (
                      <>
                        <div className="relative mx-auto flex size-[4.75rem] items-center justify-center sm:size-[5.25rem]">
                          {reduceMotion ? (
                            <>
                              <div
                                aria-hidden
                                className="absolute inset-[-18%] rounded-full blur-xl"
                                style={{
                                  background:
                                    "radial-gradient(circle, hsl(var(--color-accent, 206 48% 58%) / 0.42), transparent 68%)",
                                }}
                              />
                              <div
                                aria-hidden
                                className="relative size-[76%] rounded-full shadow-[0_0_48px_-6px_hsl(var(--color-accent)/0.5)] sm:size-[78%]"
                                style={{
                                  background:
                                    "radial-gradient(circle at 32% 28%, hsl(var(--color-accent, 206 48% 58%) / 0.92) 0%, hsl(var(--color-accent-2, 218 32% 38%) / 0.48) 44%, hsl(var(--color-bg-elevated, 0 0% 7%)) 70%)",
                                }}
                              />
                            </>
                          ) : (
                            <>
                              <motion.div
                                aria-hidden
                                className="absolute inset-[-18%] rounded-full blur-xl"
                                style={{
                                  background:
                                    "radial-gradient(circle, hsl(var(--color-accent) / 0.42), transparent 68%)",
                                }}
                                animate={{
                                  opacity: [0.5, 0.88, 0.5],
                                  scale: [0.94, 1.06, 0.94],
                                }}
                                transition={{
                                  duration: 11,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                              <motion.div
                                aria-hidden
                                className="relative size-[76%] rounded-full shadow-[0_0_48px_-6px_hsl(var(--color-accent)/0.5)] sm:size-[78%]"
                                style={{
                                  background:
                                    "radial-gradient(circle at 32% 28%, hsl(var(--color-accent) / 0.92) 0%, hsl(var(--color-accent-2) / 0.48) 44%, hsl(var(--color-bg-elevated)) 70%)",
                                }}
                                animate={{
                                  scale: [1, 1.1, 1],
                                  rotate: [0, 10, -10, 0],
                                  filter: [
                                    "hue-rotate(0deg)",
                                    "hue-rotate(14deg)",
                                    "hue-rotate(-10deg)",
                                    "hue-rotate(0deg)",
                                  ],
                                }}
                                transition={{
                                  duration: 18,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                            </>
                          )}
                        </div>
                        <h2 className="mt-5 flex min-h-[2.75rem] justify-center font-display text-2xl tracking-tight text-[hsl(var(--color-text-primary))] sm:mt-6 sm:min-h-[3.25rem] sm:text-3xl">
                          <span className="sr-only">{EMPTY_HERO_TITLE}</span>
                          <span aria-hidden className="inline-block max-w-full text-center">
                            {EMPTY_HERO_TITLE.slice(0, emptyHeroTypeIndex)}
                            {emptyHeroTypeIndex < EMPTY_HERO_TITLE.length ? (
                              reduceMotion ? (
                                <span
                                  aria-hidden
                                  className="ml-0.5 inline-block w-[0.08em] rounded-sm bg-[hsl(var(--color-accent)/0.85)]"
                                  style={{
                                    height: "0.85em",
                                    verticalAlign: "-0.1em",
                                  }}
                                />
                              ) : (
                                <motion.span
                                  aria-hidden
                                  className="ml-0.5 inline-block w-[0.08em] rounded-sm bg-[hsl(var(--color-accent)/0.85)]"
                                  style={{
                                    height: "0.85em",
                                    verticalAlign: "-0.1em",
                                  }}
                                  animate={{ opacity: [1, 0.2, 1] }}
                                  transition={{
                                    duration: 0.9,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                  }}
                                />
                              )
                            ) : null}
                          </span>
                        </h2>
                        <AnimatePresence>
                          {emptyHeroTypeIndex >= EMPTY_HERO_TITLE.length ? (
                            <motion.div
                              key="empty-hero-shimmer"
                              initial={
                                reduceMotion ? false : { opacity: 0, y: 6 }
                              }
                              animate={{ opacity: 1, y: 0 }}
                              exit={
                                reduceMotion ? undefined : { opacity: 0, y: 4 }
                              }
                              transition={{
                                duration: reduceMotion ? 0 : 0.4,
                                ease: easeOutExpo,
                              }}
                              className="mt-2"
                            >
                              <ShimmerText
                                reduceMotion={Boolean(reduceMotion)}
                                className="text-sm text-[hsl(var(--color-text-secondary))]"
                              >
                                Grounded answers with citations
                              </ShimmerText>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                        <p className="mt-4 text-xs text-[hsl(var(--color-text-tertiary))]">
                          Tap a suggestion to add it to the composer, then send.
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          {suggestedPrompts.map((prompt, i) => (
                            <motion.button
                              key={prompt}
                              type="button"
                              aria-label={`Insert suggestion: ${prompt}`}
                              initial={
                                reduceMotion ? false : { opacity: 0, y: 20 }
                              }
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                opacity: {
                                  delay: reduceMotion ? 0 : i * 0.15,
                                  duration: reduceMotion ? 0 : 0.46,
                                  ease: easeOutExpo,
                                },
                                y: reduceMotion
                                  ? { duration: 0 }
                                  : {
                                      delay: i * 0.15,
                                      type: "spring",
                                      stiffness: 360,
                                      damping: 32,
                                      mass: 0.85,
                                    },
                              }}
                              whileHover={
                                reduceMotion
                                  ? undefined
                                  : {
                                      y: -4,
                                      scale: 1.02,
                                      transition: {
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 28,
                                        mass: 0.75,
                                      },
                                    }
                              }
                              whileTap={motionTapScale(reduceMotion)}
                              style={{ willChange: "transform" }}
                              className={cn(
                                "w-full text-left transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                                focusRing,
                                "rounded-xl",
                              )}
                              onClick={() => {
                                setInputDraft(prompt);
                                requestAnimationFrame(() =>
                                  textareaRef.current?.focus(),
                                );
                              }}
                            >
                              <GlowCard
                                hoverScale={1}
                                elevatedHoverGlow
                                className="rounded-xl p-4 text-sm text-[hsl(var(--color-text-secondary))] transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[hsl(var(--color-accent)/0.4)]"
                              >
                                {prompt}
                              </GlowCard>
                            </motion.button>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <section
                    aria-label="Conversation"
                    aria-live="polite"
                    aria-busy={isStreaming}
                    className="mx-auto max-w-4xl space-y-8"
                  >
                    {messages.map((message, index) => {
                      const sources = sourcesByMessage[message.id] ?? [];
                      const isLastMessage = index === messages.length - 1;
                      const showStreamCaret =
                        isStreaming &&
                        isLastMessage &&
                        message.role === "assistant";
                      const hasAssistantContent =
                        message.role === "assistant" &&
                        Boolean(message.content);
                      const showCopy = hasAssistantContent;
                      const showRegenerate =
                        hasAssistantContent && !isStreaming && isLastMessage;
                      const showFloatingBar = showCopy || showRegenerate;
                      const caretFilterId = `caret-glow-${message.id.replace(
                        /[^a-zA-Z0-9_-]/g,
                        "_",
                      )}`;

                      if (message.role === "user") {
                        const userBubble = (
                          <div className="ml-auto max-w-[85%] sm:max-w-[80%]">
                            <p className="mb-1.5 text-right text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--color-text-tertiary))]">
                              You
                            </p>
                            <div className="gradient-border rounded-2xl rounded-tr-md bg-[hsl(var(--color-bg-elevated))] p-4 text-left text-[hsl(var(--color-text-primary))] leading-relaxed shadow-sm">
                              {message.content}
                            </div>
                          </div>
                        );
                        return reduceMotion ? (
                          <div key={message.id}>{userBubble}</div>
                        ) : (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, x: 56 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              ...userMessageSpring,
                              delay: index * 0.018,
                            }}
                          >
                            {userBubble}
                          </motion.div>
                        );
                      }

                      return (
                        <div
                          key={message.id}
                          className="flex gap-3 sm:gap-4"
                        >
                          <div
                            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--color-accent)/0.35)] bg-[hsl(var(--color-accent)/0.08)] text-[hsl(var(--color-accent))]"
                            aria-hidden
                          >
                            <BookOpen
                              className="size-4"
                              strokeWidth={1.75}
                            />
                          </div>
                          <motion.div
                            className="group/assistant relative min-w-0 flex-1"
                            initial={
                              reduceMotion ? false : { opacity: 0, height: 0 }
                            }
                            animate={
                              reduceMotion
                                ? { opacity: 1 }
                                : { opacity: 1, height: "auto" }
                            }
                            style={
                              reduceMotion ? undefined : { overflow: "hidden" }
                            }
                            transition={{
                              opacity: {
                                duration: reduceMotion ? 0 : 0.42,
                                ease: easeOutExpo,
                                delay: reduceMotion ? 0 : index * 0.018,
                              },
                              height: {
                                duration: reduceMotion ? 0 : 0.52,
                                ease: easeOutExpo,
                                delay: reduceMotion ? 0 : index * 0.018,
                              },
                            }}
                            onMouseEnter={() => {
                              if (showFloatingBar) {
                                setHoveredAssistantId(message.id);
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredAssistantId((id) =>
                                id === message.id ? null : id,
                              );
                            }}
                          >
                            <div
                              className={cn(
                                "relative overflow-hidden rounded-2xl border border-[hsl(var(--color-border-strong)/0.55)] bg-[hsl(var(--color-bg-elevated)/0.6)] shadow-[inset_0_1px_0_0_hsl(var(--color-text-primary)/0.06),0_0_0_1px_hsl(var(--color-accent)/0.08),-6px_0_36px_-14px_hsl(var(--color-accent)/0.22)] backdrop-blur-xl",
                                "[border-left-width:3px] [border-left-color:hsl(var(--color-accent)/0.5)]",
                                showFloatingBar && "pb-11",
                              )}
                            >
                              <div
                                className={cn(
                                  "px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5",
                                  showFloatingBar && "sm:pb-5",
                                )}
                              >
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={CHAT_MARKDOWN_COMPONENTS}
                                >
                                  {message.content}
                                </ReactMarkdown>
                                {showStreamCaret ? (
                                  reduceMotion ? (
                                    <span
                                      className="ml-0.5 inline-block align-middle"
                                      aria-hidden
                                    >
                                      <svg
                                        width="10"
                                        height="18"
                                        viewBox="0 0 10 18"
                                        className="inline-block translate-y-0.5"
                                        aria-hidden
                                      >
                                        <defs>
                                          <filter
                                            id={caretFilterId}
                                            x="-50%"
                                            y="-50%"
                                            width="200%"
                                            height="200%"
                                          >
                                            <feGaussianBlur
                                              stdDeviation="1.6"
                                              result="blur"
                                            />
                                            <feMerge>
                                              <feMergeNode in="blur" />
                                              <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                          </filter>
                                        </defs>
                                        <rect
                                          x="2"
                                          y="1"
                                          width="5"
                                          height="16"
                                          rx="1.5"
                                          fill="hsl(var(--color-accent))"
                                          filter={`url(#${caretFilterId})`}
                                          opacity="0.95"
                                        />
                                      </svg>
                                    </span>
                                  ) : (
                                    <motion.span
                                      className="ml-0.5 inline-block align-middle"
                                      aria-hidden
                                      initial={false}
                                      animate={{
                                        opacity: [1, 0.3, 1],
                                      }}
                                      transition={{
                                        duration: 1.35,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                      }}
                                    >
                                      <svg
                                        width="10"
                                        height="18"
                                        viewBox="0 0 10 18"
                                        className="inline-block translate-y-0.5"
                                        aria-hidden
                                      >
                                        <defs>
                                          <filter
                                            id={caretFilterId}
                                            x="-50%"
                                            y="-50%"
                                            width="200%"
                                            height="200%"
                                          >
                                            <feGaussianBlur
                                              stdDeviation="1.6"
                                              result="blur"
                                            />
                                            <feMerge>
                                              <feMergeNode in="blur" />
                                              <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                          </filter>
                                        </defs>
                                        <rect
                                          x="2"
                                          y="1"
                                          width="5"
                                          height="16"
                                          rx="1.5"
                                          fill="hsl(var(--color-accent))"
                                          filter={`url(#${caretFilterId})`}
                                          opacity="0.95"
                                        />
                                      </svg>
                                    </motion.span>
                                  )
                                ) : null}
                              </div>

                              <AnimatePresence>
                                {hoveredAssistantId === message.id &&
                                showFloatingBar ? (
                                  <motion.div
                                    key={`fab-${message.id}`}
                                    role="toolbar"
                                    aria-label="Message actions"
                                    initial={
                                      reduceMotion
                                        ? false
                                        : { opacity: 0, scale: 0.9, y: 6 }
                                    }
                                    animate={{
                                      opacity: 1,
                                      scale: 1,
                                      y: 0,
                                    }}
                                    exit={
                                      reduceMotion
                                        ? undefined
                                        : { opacity: 0, scale: 0.9, y: 4 }
                                    }
                                    transition={{
                                      duration: reduceMotion ? 0 : 0.24,
                                      ease: easeOutExpo,
                                    }}
                                    whileHover={
                                      reduceMotion
                                        ? undefined
                                        : { scale: 1.02 }
                                    }
                                    className="pointer-events-auto absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-[hsl(var(--color-border-strong)/0.55)] bg-black/40 px-1.5 py-1 shadow-[0_12px_40px_-8px_hsl(var(--color-bg,0_0%_4%)_/_0.85)] backdrop-blur-lg"
                                  >
                                    {showCopy ? (
                                      <motion.button
                                        type="button"
                                        whileTap={motionTapScale(reduceMotion)}
                                        className={cn(
                                          "rounded-full p-2.5 text-[hsl(var(--color-text-secondary))] transition-colors hover:bg-[hsl(var(--color-text-primary)/0.08)] hover:text-[hsl(var(--color-text-primary))]",
                                          focusRing,
                                        )}
                                        aria-label="Copy assistant reply"
                                        onClick={() =>
                                          void copyAssistantMessage(
                                            message.content,
                                          )
                                        }
                                      >
                                        <Copy className="size-4" aria-hidden />
                                      </motion.button>
                                    ) : null}
                                    {showRegenerate ? (
                                      <motion.button
                                        type="button"
                                        whileTap={motionTapScale(reduceMotion)}
                                        className={cn(
                                          "rounded-full p-2.5 text-[hsl(var(--color-text-secondary))] transition-colors hover:bg-[hsl(var(--color-text-primary)/0.08)] hover:text-[hsl(var(--color-text-primary))]",
                                          focusRing,
                                        )}
                                        aria-label="Regenerate last reply"
                                        onClick={() =>
                                          void reload({
                                            body: {
                                              documentIds: selectedDocumentIds,
                                            },
                                          })
                                        }
                                      >
                                        <RotateCcw
                                          className="size-4"
                                          aria-hidden
                                        />
                                      </motion.button>
                                    ) : null}
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>

                              {sources.length > 0 ? (
                                <div className="border-t border-[hsl(var(--color-border))] px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--color-text-tertiary))]">
                                    Sources · {sources.length}
                                  </p>
                                  <div className="flex gap-3 overflow-x-auto pb-1">
                                    {sources.map((source) => (
                                      <SourceCard
                                        key={source.chunkId}
                                        source={source}
                                        queryTerms={queryTerms}
                                        variant="strip"
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                    <div aria-hidden className="h-px w-full shrink-0" />
                  </section>
                )}
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex min-h-[clamp(20.5rem,38svh,26rem)] flex-col justify-end">
              <ComposerWaveBackdrop
                active={isStreaming}
                reduceMotion={Boolean(reduceMotion)}
                mouseNormRef={composerSurfaceMouseRef}
              />
              <div
                className={cn(
                  "relative z-10 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 sm:px-5",
                  "[&_*:focus-visible]:border-transparent [&_*:focus-visible]:ring-0 [&_*:focus-visible]:ring-transparent",
                )}
              >
                <div className="pointer-events-auto mx-auto w-full max-w-4xl">
                  {retrievalStatus ? (
                    <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))/0.92] px-3 py-1 text-xs text-[hsl(var(--color-text-secondary))] shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-[hsl(var(--color-bg-elevated)/0.82)]">
                      {retrievalStatus}
                      <span className="animate-pulse" aria-hidden>
                        •••
                      </span>
                    </div>
                  ) : null}
                  <motion.div
                    className={cn(
                      "rounded-[1.85rem] border border-[hsl(var(--color-border)/0.3)] bg-[hsl(var(--color-bg-elevated)/0.7)] p-[2px] shadow-[0_20px_56px_-24px_hsl(var(--color-bg)/0.85)] backdrop-blur-2xl",
                      reduceMotion &&
                        composerFocused &&
                        "ring-1 ring-[hsl(var(--color-accent)/0.42)]",
                    )}
                    animate={
                      reduceMotion
                        ? undefined
                        : {
                            boxShadow: composerFocused
                              ? "0 0 0 1px hsl(var(--color-accent) / 0.42), 0 0 44px -10px hsl(var(--color-accent) / 0.28), 0 24px 56px -22px hsl(var(--color-bg) / 0.88)"
                              : "0 0 0 1px hsl(var(--color-border) / 0.12), 0 20px 56px -24px hsl(var(--color-bg) / 0.85)",
                          }
                    }
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 0.38, ease: easeOutExpo }
                    }
                  >
                    <form
                      onSubmit={submit}
                      className="flex flex-col gap-0 rounded-[1.75rem] bg-transparent px-3 pb-3 pt-2 sm:px-4 sm:pb-3.5 sm:pt-2.5"
                    >
                      <motion.div
                        layout={!reduceMotion}
                        className="min-h-0 w-full overflow-hidden"
                        transition={{
                          layout: {
                            duration: reduceMotion ? 0 : 0.26,
                            ease: easeOutExpo,
                          },
                        }}
                      >
                        <textarea
                          ref={textareaRef}
                          value={inputDraft}
                          onChange={(event) =>
                            setInputDraft(event.target.value)
                          }
                          onKeyDown={onTextareaKeyDown}
                          onFocus={() => setComposerFocused(true)}
                          onBlur={() => setComposerFocused(false)}
                          placeholder="Ask a question about your documents..."
                          disabled={isStreaming}
                          rows={1}
                          className="min-h-[3rem] w-full resize-none overflow-y-auto bg-transparent px-1.5 py-2 text-sm leading-relaxed text-[hsl(var(--color-text-primary))] outline-none placeholder:text-[hsl(var(--color-text-secondary))] disabled:opacity-60"
                          style={{ maxHeight: COMPOSER_TEXTAREA_MAX_PX }}
                          aria-label="Message"
                        />
                      </motion.div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-[hsl(var(--color-text-secondary))]">
                          <span className="rounded-full border border-[hsl(var(--color-border-strong))] px-2 py-0.5">
                            {modelChipLabel}
                          </span>
                          <span className="rounded-full border border-[hsl(var(--color-border-strong))] px-2 py-0.5">
                            {selectedDocumentIds.length || documents.length} docs
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <motion.button
                            type="button"
                            disabled
                            aria-label="Voice input not available"
                            className="hidden size-9 items-center justify-center rounded-full border border-[hsl(var(--color-border-strong))] text-[hsl(var(--color-text-tertiary))] opacity-50 sm:inline-flex"
                          >
                            <Mic className="size-4" aria-hidden />
                          </motion.button>
                          <div
                            className={cn(
                              "relative inline-flex shrink-0 rounded-full",
                              isStreaming && !reduceMotion && "p-[2.5px]",
                            )}
                          >
                            {isStreaming && !reduceMotion ? (
                              <motion.span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 rounded-full"
                                style={{
                                  background:
                                    "conic-gradient(from 0deg, hsl(var(--color-accent) / 0.15), hsl(var(--color-accent) / 0.85), hsl(var(--color-accent-2) / 0.55), hsl(var(--color-accent) / 0.25), hsl(var(--color-accent) / 0.15))",
                                }}
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 5.5,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              />
                            ) : null}
                            <motion.button
                              type={isStreaming ? "button" : "submit"}
                              onClick={isStreaming ? stop : undefined}
                              layout={!reduceMotion}
                              whileTap={motionTapScale(reduceMotion)}
                              className={cn(
                                "relative z-10 inline-flex min-h-[2.5rem] min-w-[3.75rem] items-center justify-center rounded-full px-4 py-2 text-[hsl(var(--color-bg))] transition-[filter,background-color] duration-200",
                                isStreaming
                                  ? "border border-[hsl(var(--color-accent)/0.35)] bg-[hsl(var(--color-bg-elevated))] text-[hsl(var(--color-accent))] hover:brightness-110"
                                  : "border border-transparent bg-[hsl(var(--color-accent))] shadow-[0_0_28px_-8px_hsl(var(--color-accent)/0.75)] hover:brightness-110 disabled:cursor-not-allowed disabled:border-[hsl(var(--color-border-strong))] disabled:bg-[hsl(var(--color-text-primary)/0.1)] disabled:text-[hsl(var(--color-text-secondary))] disabled:shadow-none",
                                focusRing,
                              )}
                              disabled={!isStreaming && !inputDraft.trim()}
                              aria-label={
                                isStreaming ? "Stop generating" : "Send message"
                              }
                            >
                              <span className="relative flex size-5 items-center justify-center">
                                <AnimatePresence mode="popLayout" initial={false}>
                                  {isStreaming ? (
                                    <motion.span
                                      key="stop-icon"
                                      initial={{
                                        opacity: 0,
                                        scale: 0.82,
                                      }}
                                      animate={{
                                        opacity: 1,
                                        scale: 1,
                                      }}
                                      exit={{
                                        opacity: 0,
                                        scale: 0.82,
                                      }}
                                      transition={{
                                        duration: 0.14,
                                        ease: easeOutExpo,
                                      }}
                                      className="absolute inset-0 flex items-center justify-center"
                                    >
                                      <Square
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                    </motion.span>
                                  ) : (
                                    <motion.span
                                      key="send-icon"
                                      initial={{
                                        opacity: 0,
                                        scale: 0.82,
                                      }}
                                      animate={{
                                        opacity: 1,
                                        scale: 1,
                                      }}
                                      exit={{
                                        opacity: 0,
                                        scale: 0.82,
                                      }}
                                      transition={{
                                        duration: 0.14,
                                        ease: easeOutExpo,
                                      }}
                                      className="absolute inset-0 flex items-center justify-center"
                                    >
                                      <motion.span
                                        className="flex items-center justify-center"
                                        animate={
                                          canSendComposer && !reduceMotion
                                            ? {
                                                rotate: [0, -7, 7, -4, 4, 0],
                                              }
                                            : { rotate: 0 }
                                        }
                                        transition={
                                          canSendComposer && !reduceMotion
                                            ? {
                                                duration: 2.6,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                              }
                                            : { duration: 0 }
                                        }
                                      >
                                        <Send className="size-4" aria-hidden />
                                      </motion.span>
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </motion.div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[hsl(var(--color-text-secondary))]">
                    <span>
                      {isStreaming
                        ? "Generating…"
                        : "Enter to send · Shift+Enter new line · RAG over selected docs"}
                    </span>
                    <span>{inputDraft.length} chars</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

        <AnimatePresence>
          {showSourcesRail && latestSources.length > 0 ? (
            reduceMotion ? (
              <aside
                key="sources-rail"
                className="hidden min-h-0 w-[300px] shrink-0 xl:block xl:h-full 2xl:w-[320px]"
              >
                <div className="sticky top-6 rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay,220_14%_9%)_/_0.7)] p-4">
                  <h3 className="font-display text-base tracking-tight text-[hsl(var(--color-text-primary))]">
                    Latest sources
                  </h3>
                  <div className="mt-2 h-px bg-[hsl(var(--color-border-strong))]" />
                  <div className="mt-4 space-y-3">
                    {latestSources.map((source) => (
                      <div key={`rail-${source.chunkId}`}>
                        <SourceCard
                          source={source}
                          queryTerms={queryTerms}
                          variant="rail"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            ) : (
              <motion.aside
                key="sources-rail"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                transition={{
                  duration: 0.36,
                  ease: easeOutExpo,
                }}
                className="hidden min-h-0 w-[300px] shrink-0 xl:block xl:h-full 2xl:w-[320px]"
              >
                <div className="sticky top-6 rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.7] p-4">
                  <h3 className="font-display text-base tracking-tight text-[hsl(var(--color-text-primary))]">
                    Latest sources
                  </h3>
                  <div className="mt-2 h-px bg-[hsl(var(--color-border-strong))]" />
                  <div className="mt-4 space-y-3">
                    {latestSources.map((source, index) => (
                      <motion.div
                        key={`rail-${source.chunkId}`}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.22,
                          ease: easeOutExpo,
                          delay: index * 0.05,
                        }}
                      >
                        <SourceCard
                          source={source}
                          queryTerms={queryTerms}
                          variant="rail"
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.aside>
            )
          ) : null}
        </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
