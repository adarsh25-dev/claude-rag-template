"use client";

import {
  FormEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import useSWR from "swr";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Drawer } from "vaul";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
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
import { cn } from "@/lib/utils";
import type { Document } from "@/types/database";

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

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

  const { messages, status, stop, append, reload } = useChat({
    api: "/api/chat",
    body: {
      documentIds:
        selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
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
          documentIds:
            selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
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

  const messageMotion = useMemo(
    () => ({
      initial: reduceMotion ? undefined : { opacity: 0, y: 10 },
      animate: reduceMotion ? undefined : { opacity: 1, y: 0 },
      transition: { duration: 0.35, ease: easeOutExpo },
    }),
    [reduceMotion],
  );

  return (
    <div className="h-[calc(100dvh-5rem)] min-h-0 overflow-hidden bg-[hsl(var(--color-bg))] lg:h-[calc(100vh-5rem)]">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] items-stretch gap-6 px-6 py-6">
        <div className="hidden min-h-0 w-[240px] lg:block lg:h-full">
          {isLoading ? (
            <DocumentsSidebarSkeleton />
          ) : (
            <DocumentFilter {...documentFilterProps} />
          )}
        </div>

        <div className="flex min-h-0 h-full min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            <Drawer.Root
              open={filterDrawerOpen}
              onOpenChange={setFilterDrawerOpen}
            >
              <Drawer.Trigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.75] px-3 py-2 text-xs text-[hsl(var(--color-text-primary))]",
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
                </button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-50 bg-[hsl(var(--color-bg)/0.82)] backdrop-blur-[2px]" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))] px-4 pb-6 pt-2">
                  <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[hsl(var(--color-border-strong))]" />
                  <h3 className="font-display text-lg tracking-tight text-[hsl(var(--color-text-primary))]">
                    Documents
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--color-text-tertiary))]">
                    Choose which volumes to search before you send a message.
                  </p>
                  <div className="mt-4 max-h-[55vh] overflow-y-auto">
                    {isLoading ? (
                      <p className="py-6 text-center text-sm text-[hsl(var(--color-text-secondary))]">
                        Loading documents…
                      </p>
                    ) : (
                      <DocumentFilter {...documentFilterProps} />
                    )}
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>

            {showSourcesRail && latestSources.length > 0 ? (
              <Drawer.Root
                open={sourcesDrawerOpen}
                onOpenChange={setSourcesDrawerOpen}
              >
                <Drawer.Trigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.75] px-3 py-2 text-xs text-[hsl(var(--color-text-primary))] xl:hidden",
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
                  </button>
                </Drawer.Trigger>
                <Drawer.Portal>
                  <Drawer.Overlay className="fixed inset-0 z-50 bg-[hsl(var(--color-bg)/0.82)] backdrop-blur-[2px]" />
                  <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))] px-4 pb-6 pt-2 xl:hidden">
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[hsl(var(--color-border-strong))]" />
                    <h3 className="font-display text-lg tracking-tight text-[hsl(var(--color-text-primary))]">
                      Latest sources
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--color-text-tertiary))]">
                      Passages retrieved for your last reply.
                    </p>
                    <div className="mt-4 max-h-[58vh] space-y-3 overflow-y-auto">
                      {latestSources.map((source) => (
                        <SourceCard
                          key={`drawer-${source.chunkId}`}
                          source={source}
                          queryTerms={queryTerms}
                          variant="rail"
                        />
                      ))}
                    </div>
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
                        <button
                          type="button"
                          onClick={() => void mutate()}
                          className={cn(
                            "rounded-full border border-[hsl(var(--color-border-strong))] px-4 py-2 text-sm text-[hsl(var(--color-text-primary))] hover:bg-[hsl(var(--color-bg-hover))]",
                            focusRing,
                          )}
                        >
                          Retry
                        </button>
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
                        <Sparkles
                          className="mx-auto size-11 text-[hsl(var(--color-accent))] sm:size-12"
                          aria-hidden
                        />
                        <h2 className="mt-4 font-display text-2xl tracking-tight text-[hsl(var(--color-text-primary))] sm:text-3xl">
                          Ask anything about your documents.
                        </h2>
                        <ShimmerText className="mt-2 text-sm text-[hsl(var(--color-text-secondary))]">
                          Grounded answers with citations
                        </ShimmerText>
                        <p className="mt-4 text-xs text-[hsl(var(--color-text-tertiary))]">
                          Tap a suggestion to add it to the composer, then send.
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          {suggestedPrompts.map((prompt, i) => (
                            <motion.div
                              key={prompt}
                              initial={
                                reduceMotion ? undefined : { opacity: 0, y: 12 }
                              }
                              animate={
                                reduceMotion ? undefined : { opacity: 1, y: 0 }
                              }
                              transition={{
                                delay: reduceMotion ? 0 : i * 0.07,
                                duration: 0.38,
                                ease: easeOutExpo,
                              }}
                            >
                              <button
                                type="button"
                                aria-label={`Insert suggestion: ${prompt}`}
                                className={cn(
                                  "w-full text-left transition-[transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
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
                                  hoverScale={reduceMotion ? 1 : 1.01}
                                  className="rounded-xl p-4 text-sm text-[hsl(var(--color-text-secondary))] transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[hsl(var(--color-accent)/0.4)]"
                                >
                                  {prompt}
                                </GlowCard>
                              </button>
                            </motion.div>
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
                    className="mx-auto max-w-3xl space-y-8"
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

                      return (
                        <motion.div
                          key={message.id}
                          initial={messageMotion.initial}
                          animate={messageMotion.animate}
                          transition={{
                            ...messageMotion.transition,
                            delay: reduceMotion ? 0 : index * 0.02,
                          }}
                        >
                          {message.role === "user" ? (
                            <div className="ml-auto max-w-[85%] sm:max-w-[80%]">
                              <p className="mb-1.5 text-right text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--color-text-tertiary))]">
                                You
                              </p>
                              <div className="gradient-border rounded-2xl rounded-tr-md bg-[hsl(var(--color-bg-elevated))] p-4 text-left text-[hsl(var(--color-text-primary))] leading-relaxed shadow-sm">
                                {message.content}
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3 sm:gap-4">
                              <div
                                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--color-accent)/0.35)] bg-[hsl(var(--color-accent)/0.08)] text-[hsl(var(--color-accent))]"
                                aria-hidden
                              >
                                <BookOpen
                                  className="size-4"
                                  strokeWidth={1.75}
                                />
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))] shadow-sm [border-left-width:3px] [border-left-color:hsl(var(--color-accent)/0.45)]">
                                <div className="px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={CHAT_MARKDOWN_COMPONENTS}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                  {showStreamCaret ? (
                                    <span
                                      className="animate-blink text-[hsl(var(--color-accent))]"
                                      aria-hidden
                                    >
                                      ▋
                                    </span>
                                  ) : null}
                                </div>

                                {showCopy || showRegenerate ? (
                                  <div className="flex items-center gap-0.5 border-t border-[hsl(var(--color-border))] px-2 py-1.5 sm:px-3">
                                    {showCopy ? (
                                      <button
                                        type="button"
                                        className={cn(
                                          "rounded-md p-2.5 text-[hsl(var(--color-text-secondary))] transition-colors hover:bg-[hsl(var(--color-bg-hover))]",
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
                                      </button>
                                    ) : null}
                                    {showRegenerate ? (
                                      <button
                                        type="button"
                                        className={cn(
                                          "rounded-md p-2.5 text-[hsl(var(--color-text-secondary))] transition-colors hover:bg-[hsl(var(--color-bg-hover))]",
                                          focusRing,
                                        )}
                                        aria-label="Regenerate last reply"
                                        onClick={() =>
                                          void reload({
                                            body: {
                                              documentIds:
                                                selectedDocumentIds.length > 0
                                                  ? selectedDocumentIds
                                                  : undefined,
                                            },
                                          })
                                        }
                                      >
                                        <RotateCcw
                                          className="size-4"
                                          aria-hidden
                                        />
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}

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
                            </div>
                          )}
                        </motion.div>
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
              />
              <div
                className={cn(
                  "relative z-10 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 sm:px-5",
                  "[&_*:focus-visible]:border-transparent [&_*:focus-visible]:ring-0 [&_*:focus-visible]:ring-transparent",
                )}
              >
                <div className="pointer-events-auto mx-auto w-full max-w-3xl">
                  {retrievalStatus ? (
                    <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))/0.92] px-3 py-1 text-xs text-[hsl(var(--color-text-secondary))] shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-[hsl(var(--color-bg-elevated)/0.82)]">
                      {retrievalStatus}
                      <span className="animate-pulse" aria-hidden>
                        •••
                      </span>
                    </div>
                  ) : null}
                  <form
                    onSubmit={submit}
                    className="rounded-[1.35rem] border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))] p-3 shadow-[0_0_50px_-18px_hsl(var(--color-accent)/0.22)] ring-1 ring-[hsl(var(--color-border)/0.45)]"
                  >
                    <textarea
                      ref={textareaRef}
                      value={inputDraft}
                      onChange={(event) => setInputDraft(event.target.value)}
                      onKeyDown={onTextareaKeyDown}
                      placeholder="Ask a question about your documents..."
                      disabled={isStreaming}
                      className="max-h-48 min-h-[5.5rem] w-full resize-none bg-transparent px-1 py-1 text-sm leading-relaxed text-[hsl(var(--color-text-primary))] outline-none placeholder:text-[hsl(var(--color-text-secondary))] disabled:opacity-60"
                      aria-label="Message"
                    />
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
                        <button
                          type="button"
                          disabled
                          aria-label="Voice input not available"
                          className="hidden size-9 items-center justify-center rounded-full border border-[hsl(var(--color-border-strong))] text-[hsl(var(--color-text-tertiary))] opacity-50 sm:inline-flex"
                        >
                          <Mic className="size-4" aria-hidden />
                        </button>
                        {isStreaming ? (
                          <motion.button
                            type="button"
                            onClick={stop}
                            animate={
                              reduceMotion ? undefined : { scale: [1, 1.03, 1] }
                            }
                            transition={
                              reduceMotion
                                ? undefined
                                : { duration: 1.4, repeat: Infinity }
                            }
                            className={cn(
                              "inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-[hsl(var(--color-accent)/0.75)] bg-[hsl(var(--color-accent)/0.16)] text-[hsl(var(--color-accent))] transition-colors duration-200 hover:brightness-110",
                              focusRing,
                            )}
                            aria-label="Stop generating"
                          >
                            <Square className="size-3.5" aria-hidden />
                          </motion.button>
                        ) : (
                          <motion.button
                            type="submit"
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                              "inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-[hsl(var(--color-accent))] text-[hsl(var(--color-bg))] shadow-[0_0_24px_-10px_hsl(var(--color-accent)/0.85)] transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[hsl(var(--color-text-primary)/0.14)] disabled:text-[hsl(var(--color-text-secondary))] disabled:shadow-none",
                              focusRing,
                            )}
                            disabled={!inputDraft.trim()}
                            aria-label="Send message"
                          >
                            <Send className="size-4" aria-hidden />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </form>
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

        {showSourcesRail ? (
          <aside className="hidden min-h-0 w-[320px] xl:block xl:h-full">
            <div className="sticky top-6 rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.7] p-4">
              <h3 className="font-display text-base tracking-tight text-[hsl(var(--color-text-primary))]">
                Latest sources
              </h3>
              <div className="mt-2 h-px bg-[hsl(var(--color-border-strong))]" />
              <div className="mt-4 space-y-3">
                {latestSources.map((source) => (
                  <SourceCard
                    key={`rail-${source.chunkId}`}
                    source={source}
                    queryTerms={queryTerms}
                    variant="rail"
                  />
                ))}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
