"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search, FileText, MessageSquare, Upload, Library } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-overlay))] shadow-2xl overflow-hidden">
              <Command className="[&_[cmdk-input]]:h-12 [&_[cmdk-input]]:px-4 [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:text-[hsl(var(--color-text-primary))] [&_[cmdk-input]]:outline-none [&_[cmdk-input]]:border-b [&_[cmdk-input]]:border-[hsl(var(--color-border))] [&_[cmdk-item]]:px-4 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:mx-2 [&_[cmdk-item]]:cursor-pointer [&_[cmdk-group]]:py-2 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-[hsl(var(--color-text-tertiary))] [&_[cmdk-item][aria-selected]]:bg-[hsl(var(--color-bg-hover))] [&_[cmdk-item]]:text-[hsl(var(--color-text-secondary))] [&_[cmdk-item]_svg]:mr-3 [&_[cmdk-item]_svg]:text-[hsl(var(--color-text-tertiary))]">
                <div className="flex items-center px-4 border-b border-[hsl(var(--color-border))]">
                  <Search className="w-4 h-4 text-[hsl(var(--color-text-tertiary))]" />
                  <Command.Input
                    placeholder="Search documents, chat, or navigate..."
                    className="flex-1 h-12 px-3 bg-transparent text-[hsl(var(--color-text-primary))] placeholder:text-[hsl(var(--color-text-tertiary))] outline-none"
                  />
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-[hsl(var(--color-bg-hover))] text-[hsl(var(--color-text-tertiary))] border border-[hsl(var(--color-border))]">
                    Esc
                  </kbd>
                </div>
                <Command.List className="max-h-[400px] overflow-y-auto p-2">
                  <Command.Empty className="py-8 text-center text-[hsl(var(--color-text-tertiary))]">
                    No results found.
                  </Command.Empty>
                  <Command.Group heading="Navigation">
                    <Command.Item onSelect={() => { window.location.href = "/chat"; setOpen(false); }}>
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </Command.Item>
                    <Command.Item onSelect={() => { window.location.href = "/library"; setOpen(false); }}>
                      <Library className="w-4 h-4" />
                      Library
                    </Command.Item>
                    <Command.Item onSelect={() => { window.location.href = "/upload"; setOpen(false); }}>
                      <Upload className="w-4 h-4" />
                      Upload
                    </Command.Item>
                  </Command.Group>
                  <Command.Group heading="Recent Documents">
                    <Command.Item>
                      <FileText className="w-4 h-4" />
                      Sample Research Paper
                    </Command.Item>
                  </Command.Group>
                </Command.List>
              </Command>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
