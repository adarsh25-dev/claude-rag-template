"use client";

import { useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { UploadCloud, FileText, FileType2, ScrollText, FileCode2 } from "lucide-react";
import { BorderBeam } from "@/components/ui/primitives/border-beam";
import { cn } from "@/lib/utils";

const ACCEPTED: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/markdown": [".md"],
  "text/plain": [".txt"],
};

type UploadDropzoneProps = {
  disabled?: boolean;
  onFilesAccepted: (files: File[]) => void;
};

const fileKinds = [
  { label: "PDF", icon: FileText },
  { label: "DOCX", icon: FileType2 },
  { label: "MD", icon: FileCode2 },
  { label: "TXT", icon: ScrollText },
];

export function UploadDropzone({ disabled, onFilesAccepted }: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    multiple: true,
    disabled,
    maxSize: 10 * 1024 * 1024,
    accept: ACCEPTED,
    onDropAccepted: onFilesAccepted,
  });

  const message = useMemo(() => {
    if (isDragReject) return "Some files are not supported.";
    if (isDragActive) return "Release to add your files";
    return "Drop files here or click to browse";
  }, [isDragActive, isDragReject]);

  return (
    <div {...getRootProps()}>
      <motion.div
      className={cn(
        "relative cursor-pointer rounded-2xl p-12 glass gradient-border transition-all duration-300",
        "border border-[hsl(var(--color-border-strong))]",
        isDragActive && "shadow-[0_24px_50px_-32px_hsl(var(--color-accent-glow))]",
        isDragReject && "shadow-[0_24px_50px_-32px_hsl(var(--color-danger)/0.45)]"
      )}
      animate={
        isDragReject
          ? { x: [0, -3, 3, -2, 2, 0] }
          : isDragActive
            ? { scale: 1.01 }
            : { scale: 1 }
      }
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <input {...getInputProps()} />
      {isDragActive && !isDragReject ? <BorderBeam duration={2.6} /> : null}

      <div className="absolute inset-6 rounded-xl border border-dashed border-[hsl(var(--color-border-strong))]" />

      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">
        <UploadCloud className="mb-4 size-12 text-[hsl(var(--color-accent))]" />
        <p className="text-base font-medium text-[hsl(var(--color-text-primary))]">{message}</p>
        <p className="mt-2 text-sm text-[hsl(var(--color-text-secondary))]">Maximum 10MB per file</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {fileKinds.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))/0.6] px-3 py-1 text-xs text-[hsl(var(--color-text-secondary))]"
            >
              <Icon className="size-3.5" />
              {label}
            </span>
          ))}
        </div>
      </div>
      </motion.div>
    </div>
  );
}
