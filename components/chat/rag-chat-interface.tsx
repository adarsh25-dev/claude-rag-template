"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Send,
  Mic,
  Square,
  FileX,
} from "lucide-react";
import { toast } from "sonner";
import { ShimmerText } from "@/components/ui/primitives/shimmer-text";
import { GlowCard } from "@/components/ui/primitives/glow-card";
import { MagneticButton } from "@/components/ui/primitives/magnetic-button";
import { DocumentFilter } from "@/components/chat/document-filter";
import { SourceCard, type SourceItem } from "@/components/chat/source-card";
import { cn } from "@/lib/utils";
import { ensureBrowserSession } from "@/lib/supabase/browser-session";
import type { Document } from "@/types/database";

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Request failed");
  return response.json() as Promise<T>;
};

export function RagChatInterface() {
  const { data } = useSWR<{ documents: Document[] }>("/api/documents", fetcher);
  const documents = useMemo(() => data?.documents ?? [], [data?.documents]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [sourcesByMessage, setSourcesByMessage] = useState<Record<string, SourceItem[]>>({});
  const [inputDraft, setInputDraft] = useState("");
  const [showSourcesRail, setShowSourcesRail] = useState(false);
  const [retrievalStatus, setRetrievalStatus] = useState<string | null>(null);
  const pendingSourcesRef = useRef<SourceItem[]>([]);

  const chat = useChat({
    api: "/api/chat",
    body: {
      documentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
    },
    onResponse: (response) => {
      setRetrievalStatus(`Reading ${response.headers.get("x-rag-source-count") ?? 0} sources`);
      const encoded = response.headers.get("x-rag-sources");
      const next = encoded ? (JSON.parse(decodeURIComponent(encoded)) as SourceItem[]) : [];
      pendingSourcesRef.current = next;
      setShowSourcesRail(next.length > 0);
      setTimeout(() => setRetrievalStatus(null), 800);
    },
    onFinish: (message) => {
      if (pendingSourcesRef.current.length > 0) {
        setSourcesByMessage((prev) => ({ ...prev, [message.id]: pendingSourcesRef.current }));
      }
    },
    onError: () => toast.error("Chat request failed."),
  }) as unknown as {
    messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string }>;
    status: "ready" | "submitted" | "streaming" | "error";
    stop: () => void;
    regenerate: () => void;
    sendMessage: (message: { text: string }, options?: { body?: unknown }) => Promise<void>;
  };

  const { messages, status, stop } = chat;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputDraft.trim()) return;

    const session = await ensureBrowserSession();
    if (!session.ok) {
      toast.error(session.message);
      return;
    }

    setRetrievalStatus(`Searching ${selectedDocumentIds.length || documents.length || 0} documents…`);
    void chat.sendMessage(
      { text: inputDraft },
      {
        body: {
          documentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        },
      }
    );
    setInputDraft("");
  };

  const queryTerms = useMemo(() => inputDraft.split(/\s+/).filter((word) => word.length > 2), [inputDraft]);

  const suggestedPrompts = useMemo(() => {
    const title = documents[0]?.title ?? "this document";
    return [
      `Summarize ${title}`,
      "What are the key takeaways?",
      "Find sections about timeline and milestones",
      "List the action items",
    ];
  }, [documents]);

  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const latestSources = latestAssistant ? sourcesByMessage[latestAssistant.id] ?? [] : [];

  return (
    <div className="min-h-screen bg-[hsl(var(--color-bg))]">
      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-6 py-6">
        <div className="hidden w-[240px] lg:block">
          <DocumentFilter
            documents={documents}
            selectedIds={selectedDocumentIds}
            onToggle={(id) =>
              setSelectedDocumentIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
            }
            onToggleAll={() => setSelectedDocumentIds([])}
            onClear={() => setSelectedDocumentIds([])}
          />
        </div>

        <div className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col">
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.5]">
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.12]" />
            <div className="relative z-10 h-full overflow-y-auto px-6 py-8">
              {messages.length === 0 ? (
                <div className="mx-auto mt-16 max-w-2xl text-center">
                  {documents.length === 0 ? (
                    <div className="space-y-4">
                      <FileX className="mx-auto size-10 text-[hsl(var(--color-text-tertiary))]" />
                      <h2 className="text-2xl font-semibold text-[hsl(var(--color-text-primary))]">No documents yet</h2>
                      <p className="text-[hsl(var(--color-text-secondary))]">Upload your first document to start chatting.</p>
                      <MagneticButton href="/upload" variant="primary">
                        Upload your first document
                      </MagneticButton>
                    </div>
                  ) : (
                    <>
                      <Sparkles className="mx-auto size-12 text-[hsl(var(--color-accent))]" />
                      <h2 className="mt-4 text-3xl font-display text-[hsl(var(--color-text-primary))]">Ask anything about your documents.</h2>
                      <ShimmerText className="mt-2 text-sm text-[hsl(var(--color-text-secondary))]">Grounded answers with citations</ShimmerText>
                      <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {suggestedPrompts.map((prompt) => (
                          <button key={prompt} type="button" onClick={() => setInputDraft(prompt)}>
                            <GlowCard className="rounded-xl p-4 text-left text-sm text-[hsl(var(--color-text-secondary))] hover:border-[hsl(var(--color-accent)/0.4)]">
                              {prompt}
                            </GlowCard>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-8">
                  {messages.map((message) => {
                    const sources = sourcesByMessage[message.id] ?? [];
                    return (
                      <div key={message.id}>
                        {message.role === "user" ? (
                          <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-white/6 p-4 text-[hsl(var(--color-text-primary))]">
                            {message.content}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <span className={cn("mt-1 size-2 rounded-full bg-[hsl(var(--color-accent))]", status === "streaming" ? "animate-pulse" : "")} />
                              <div className="min-w-0 flex-1 text-[hsl(var(--color-text-secondary))]">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h1: ({ children }) => <h1 className="font-display text-2xl text-[hsl(var(--color-text-primary))]">{children}</h1>,
                                    h2: ({ children }) => <h2 className="font-display text-xl text-[hsl(var(--color-text-primary))]">{children}</h2>,
                                    a: ({ children, ...props }) => (
                                      <a {...props} className="text-[hsl(var(--color-accent))] underline-offset-2 hover:underline">
                                        {children}
                                      </a>
                                    ),
                                    code: ({ className, children }) =>
                                      className?.includes("language-") ? (
                                        <pre className="rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))] p-3">
                                          <code>{children}</code>
                                        </pre>
                                      ) : (
                                        <code className="rounded bg-white/6 px-1.5 py-0.5">{children}</code>
                                      ),
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                                {status === "streaming" ? <span className="animate-blink">▋</span> : null}
                              </div>
                            </div>

                            {message.role === "assistant" && message.content ? (
                              <div className="ml-5 flex items-center gap-2 opacity-80">
                                <button className="rounded p-1 hover:bg-[hsl(var(--color-bg-hover))]">
                                  <Copy className="size-4" />
                                </button>
                                <button className="rounded p-1 hover:bg-[hsl(var(--color-bg-hover))]" onClick={() => chat.regenerate()}>
                                  <RotateCcw className="size-4" />
                                </button>
                                <button className="rounded p-1 hover:bg-[hsl(var(--color-bg-hover))]">
                                  <ThumbsUp className="size-4" />
                                </button>
                                <button className="rounded p-1 hover:bg-[hsl(var(--color-bg-hover))]">
                                  <ThumbsDown className="size-4" />
                                </button>
                              </div>
                            ) : null}

                            {sources.length > 0 ? (
                              <div className="ml-5">
                                <p className="mb-2 text-xs uppercase tracking-wide text-[hsl(var(--color-text-tertiary))]">
                                  Sources · {sources.length}
                                </p>
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                  {sources.map((source) => (
                                    <SourceCard key={source.chunkId} source={source} queryTerms={queryTerms} />
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mx-auto mt-4 w-full max-w-3xl">
            {retrievalStatus ? (
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.8] px-3 py-1 text-xs text-[hsl(var(--color-text-secondary))]">
                {retrievalStatus}
                <span className="animate-pulse">•••</span>
              </div>
            ) : null}
            <form onSubmit={submit} className="rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.75] p-3">
              <textarea
                value={inputDraft}
                onChange={(event) => {
                  setInputDraft(event.target.value);
                }}
                placeholder="Ask a question about your documents..."
                className="max-h-48 min-h-[80px] w-full resize-none bg-transparent outline-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[hsl(var(--color-text-secondary))]">
                  <span className="rounded-full border border-[hsl(var(--color-border-strong))] px-2 py-0.5">DeepSeek V4 Pro</span>
                  <span className="rounded-full border border-[hsl(var(--color-border-strong))] px-2 py-0.5">
                    {selectedDocumentIds.length || documents.length} docs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-full border border-[hsl(var(--color-border-strong))] p-2 text-[hsl(var(--color-text-secondary))]">
                    <Mic className="size-4" />
                  </button>
                  {status === "streaming" ? (
                    <button type="button" onClick={stop} className="rounded-full bg-[hsl(var(--color-accent))] p-2 text-black">
                      <Square className="size-4" />
                    </button>
                  ) : (
                    <button type="submit" className="rounded-full bg-[hsl(var(--color-accent))] p-2 text-black disabled:opacity-50" disabled={!inputDraft.trim()}>
                      <Send className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </form>
            <div className="mt-2 flex items-center justify-between text-xs text-[hsl(var(--color-text-tertiary))]">
              <span>Press Enter to send · Shift+Enter for new line</span>
              <span>{inputDraft.length} chars</span>
            </div>
          </div>
        </div>

        {showSourcesRail ? (
          <aside className="hidden w-[320px] xl:block">
            <div className="sticky top-6 rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.7] p-4">
              <h3 className="text-sm text-[hsl(var(--color-text-primary))]">Latest sources</h3>
              <div className="mt-3 space-y-3">
                {latestSources.map((source) => (
                  <SourceCard key={`rail-${source.chunkId}`} source={source} queryTerms={queryTerms} />
                ))}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
