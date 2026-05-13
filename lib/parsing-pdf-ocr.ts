/**
 * OCR fallback for scanned (image-only) PDFs. Runs only when pdf-parse returns no text.
 * Server-only (Node); keep lazy-imported so route bundles stay predictable.
 */
export async function extractPdfTextWithOcr(buffer: Buffer): Promise<string> {
  if (process.env.DISABLE_PDF_OCR === "1") {
    return "";
  }

  const maxPages = Math.min(
    50,
    Math.max(1, Number.parseInt(process.env.PDF_OCR_MAX_PAGES ?? "15", 10) || 15)
  );

  const lang = (process.env.PDF_OCR_LANG ?? "eng").trim() || "eng";

  try {
    const [{ pdf }, { createWorker }] = await Promise.all([
      import("pdf-to-img"),
      import("tesseract.js"),
    ]);

    const worker = await createWorker(lang);
    try {
      const doc = await pdf(Uint8Array.from(buffer), { scale: 1.75 });
      const parts: string[] = [];
      let page = 0;
      try {
        for await (const image of doc) {
          page += 1;
          if (page > maxPages) break;
          const { data } = await worker.recognize(image);
          const t = data.text.trim();
          if (t.length > 0) parts.push(t);
        }
      } finally {
        await doc.destroy();
      }
      return parts.join("\n\n");
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.error("[pdf-ocr] failed:", error);
    return "";
  }
}
