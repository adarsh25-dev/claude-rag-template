"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { AuroraBackground } from "@/components/ui/primitives/aurora-background";
import { MagneticButton } from "@/components/ui/primitives/magnetic-button";
import { Button } from "@/components/ui/button";
import { FileText, FileCode2, ScrollText, FileType2, X } from "lucide-react";

type UploadStatus = {
  progress: number;
  message: string;
  uploading: boolean;
  error?: string;
};

function kindIcon(file: File) {
  if (file.type.includes("pdf")) return FileText;
  if (file.type.includes("markdown")) return FileCode2;
  if (file.type.includes("word")) return FileType2;
  return ScrollText;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<UploadStatus>({
    progress: 0,
    message: "Drop your files to start indexing",
    uploading: false,
  });

  const canUpload = files.length > 0 && !status.uploading;

  const upload = async () => {
    if (!files.length || status.uploading) return;
    setStatus({ progress: 10, message: "Uploading files…", uploading: true });

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const formData = new FormData();
        formData.append("file", file);

        const uploadProgress = Math.round(((index + 1) / files.length) * 45);
        setStatus({ progress: uploadProgress, message: `Parsing ${file.name}…`, uploading: true });

        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          if (response.status === 401) {
            throw new Error("Your session expired. Sign in again from the home page.");
          }
          throw new Error(body?.error ?? "Upload failed");
        }

        setStatus({
          progress: Math.max(uploadProgress, 50),
          message: `Generating embeddings (${index + 1}/${files.length})…`,
          uploading: true,
        });
      }

      setStatus({ progress: 100, message: "All files queued for indexing", uploading: false });
      confetti({
        particleCount: 24,
        spread: 70,
        colors: ["#6fa8d6", "#dfe9f4", "#8a9eb8"],
      });
      toast.success("Documents uploaded and processing started.");
      router.push("/library");
    } catch (error) {
      setStatus({
        progress: 0,
        message: "Upload failed",
        uploading: false,
        error: error instanceof Error ? error.message : "Unexpected upload error",
      });
      toast.error("Failed to upload files.");
    }
  };

  const helper = useMemo(() => {
    if (status.uploading) return status.message;
    return "Supported formats: PDF, DOCX, MD, TXT";
  }, [status]);

  return (
    <AuroraBackground className="min-h-[calc(100vh-3.5rem)]">
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.5] px-4 py-1 text-xs text-[hsl(var(--color-text-secondary))]">
            <span className="size-1.5 rounded-full bg-[hsl(var(--color-accent))]" />
            Upload · Parse · Embed
          </div>
          <h1 className="font-display text-4xl tracking-tight text-[hsl(var(--color-text-primary))]">
            Add documents to your library
          </h1>
          <p className="mt-3 text-[hsl(var(--color-text-secondary))]">
            Bring PDFs, markdown notes, plain text, and DOCX files into your searchable archive.
          </p>
        </div>

        <UploadDropzone
          disabled={status.uploading}
          onFilesAccepted={(accepted) => setFiles((prev) => [...prev, ...accepted])}
        />

        <AnimatePresence>
          {files.length > 0 ? (
            <motion.div
              className="mt-6 space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              {files.map((file, index) => {
                const Icon = kindIcon(file);
                return (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    className="flex items-center justify-between rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))/0.8] p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon className="size-5 text-[hsl(var(--color-accent))]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[hsl(var(--color-text-primary))]">{file.name}</p>
                        <p className="text-xs text-[hsl(var(--color-text-tertiary))]">
                          {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "unknown"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <X className="size-4 text-[hsl(var(--color-danger))]" />
                    </Button>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-8 flex flex-col items-center gap-3">
          <MagneticButton variant="primary" onClick={upload} disabled={!canUpload}>
            Upload documents
          </MagneticButton>
          <div className="h-1 w-full overflow-hidden rounded-full bg-[hsl(var(--color-border))]">
            <motion.div
              className="h-full bg-[hsl(var(--color-accent))]"
              animate={{ width: `${status.progress}%` }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="text-sm text-[hsl(var(--color-text-secondary))]">{helper}</p>
          {status.error ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-danger)/0.5)] bg-[hsl(var(--color-danger)/0.12)] px-3 py-1 text-xs text-[hsl(var(--color-danger))] shadow-[0_0_16px_hsl(var(--color-danger)/0.25)]">
              {status.error}
              <button type="button" className="underline" onClick={upload}>
                Retry
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </AuroraBackground>
  );
}
