"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { FileX } from "lucide-react";
import { DocumentCard } from "@/components/documents/document-card";
import { RevealOnScroll } from "@/components/ui/primitives/reveal-on-scroll";
import { MagneticButton } from "@/components/ui/primitives/magnetic-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Document } from "@/types/database";

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Request failed");
  return response.json() as Promise<T>;
};

const FILTERS: Array<"all" | Document["status"]> = ["all", "processing", "ready", "failed"];

export default function LibraryPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");

  const { data, isLoading, mutate } = useSWR<{ documents: Document[] }>("/api/documents", fetcher, {
    refreshInterval: (latest) =>
      latest?.documents?.some((doc) => doc.status === "processing") ? 3000 : 0,
  });

  const filtered = useMemo(() => {
    const documents = data?.documents ?? [];
    return documents.filter((doc) => {
      const statusPass = filter === "all" || doc.status === filter;
      const queryPass =
        !query ||
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.filename.toLowerCase().includes(query.toLowerCase());
      return statusPass && queryPass;
    });
  }, [data?.documents, filter, query]);

  const remove = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE", credentials: "same-origin" });
    await mutate();
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-3xl text-[hsl(var(--color-text-primary))]">Document library</h1>
            <p className="mt-2 text-[hsl(var(--color-text-secondary))]">Manage uploads, indexing status, and search readiness.</p>
          </div>
          <MagneticButton href="/upload" variant="primary">
            + Add document
          </MagneticButton>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setFilter(pill)}
              className={`rounded-full border px-3 py-1 text-xs transition-all ${
                filter === pill
                  ? "gradient-border border-[hsl(var(--color-accent)/0.6)] text-[hsl(var(--color-text-primary))] shadow-[0_0_18px_hsl(var(--color-accent-glow))]"
                  : "border-[hsl(var(--color-border-strong))] text-[hsl(var(--color-text-secondary))]"
              }`}
            >
              {pill[0].toUpperCase() + pill.slice(1)}
            </button>
          ))}
        </div>

        <div className="mb-8">
          <Input
            placeholder="Search documents..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-sm rounded-full bg-[hsl(var(--color-bg-overlay))/0.7]"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[hsl(var(--color-border-strong))] p-5">
                <Skeleton className="mb-4 h-5 w-2/3 animate-shimmer" />
                <Skeleton className="mb-3 h-4 w-1/2 animate-shimmer" />
                <Skeleton className="h-20 w-full animate-shimmer" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <FileX className="size-10 text-[hsl(var(--color-text-tertiary))]" />
            <h2 className="mt-4 text-xl text-[hsl(var(--color-text-primary))]">No documents yet</h2>
            <p className="mt-2 text-sm text-[hsl(var(--color-text-secondary))]">Upload your first document to start searching with RAG.</p>
            <div className="mt-4">
              <MagneticButton href="/upload" variant="primary">
                Upload your first document
              </MagneticButton>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc, index) => (
              <RevealOnScroll key={doc.id} delay={index * 0.05}>
                <DocumentCard document={doc} onDelete={remove} />
              </RevealOnScroll>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
