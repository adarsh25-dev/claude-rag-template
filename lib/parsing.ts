import MarkdownIt from "markdown-it";

export interface ParseResult {
  text: string;
  pageCount?: number;
}

type PdfTextItem = { str?: string; transform?: number[] };

function pdfItemString(item: unknown): string {
  if (item && typeof item === "object" && "str" in item && typeof (item as PdfTextItem).str === "string") {
    return (item as PdfTextItem).str ?? "";
  }
  return "";
}

function pdfItemTransformY(item: unknown): number {
  if (item && typeof item === "object" && "transform" in item) {
    const t = (item as PdfTextItem).transform;
    if (Array.isArray(t) && typeof t[5] === "number") return t[5];
  }
  return 0;
}

type PdfPageData = {
  getTextContent: (options: { normalizeWhitespace?: boolean; disableCombineTextItems?: boolean }) => Promise<{
    items: unknown[];
  }>;
};

function buildPdfPageRenderer(normalizeWhitespace: boolean) {
  return function renderPage(pageData: PdfPageData): Promise<string> {
    const renderOptions = { normalizeWhitespace, disableCombineTextItems: false };
    return pageData.getTextContent(renderOptions).then((textContent) => {
      let lastY: number | undefined;
      let text = "";
      for (const item of textContent.items) {
        const y = pdfItemTransformY(item);
        const str = pdfItemString(item);
        if (lastY === y || lastY === undefined) {
          text += str;
        } else {
          text += `\n${str}`;
        }
        lastY = y;
      }
      return text;
    });
  };
}

export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  // Never import `pdf-parse` root `index.js`: when `module.parent` is falsy (Next/ESM),
  // it runs a debug branch that reads `./test/data/05-versions-space.pdf` → ENOENT.
  type PdfData = { text: string; numpages: number };
  type PdfParseFn = (data: Buffer, options?: unknown) => Promise<PdfData>;
  const mod = (await import("pdf-parse/lib/pdf-parse.js")) as PdfParseFn | { default: PdfParseFn };
  const pdfParse: PdfParseFn = typeof mod === "function" ? mod : mod.default;

  const withNormalized = await pdfParse(buffer, {
    version: "v1.10.100",
    max: 0,
    pagerender: buildPdfPageRenderer(true),
  });

  const text = withNormalized.text.trim();
  if (text.length > 0) {
    return { text: withNormalized.text, pageCount: withNormalized.numpages };
  }

  const legacy = await pdfParse(buffer, {
    version: "v1.10.100",
    max: 0,
    pagerender: buildPdfPageRenderer(false),
  });

  const legacyText = legacy.text.trim();
  if (legacyText.length > 0) {
    return { text: legacy.text, pageCount: legacy.numpages };
  }

  const pages = legacy.numpages;
  if (pages > 0) {
    const { extractPdfTextWithOcr } = await import("@/lib/parsing-pdf-ocr");
    const ocrText = (await extractPdfTextWithOcr(buffer)).trim();
    if (ocrText.length > 0) {
      return { text: ocrText, pageCount: pages };
    }

    throw new Error(
      "This PDF has no selectable text and OCR did not recover usable text. " +
        "Try a sharper scan, a text-based export from the source app, or run OCR elsewhere first. " +
        "You can raise PDF_OCR_MAX_PAGES (default 15) for long documents, or set DISABLE_PDF_OCR=1 to skip OCR."
    );
  }

  throw new Error(
    "Could not read this PDF (no pages or unreadable). The file may be corrupted, password-locked, or not a real PDF."
  );
}

export async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  if (!text) {
    throw new Error(
      "This Word document has no extractable plain text. It may be empty, image-only, or use content mammoth cannot read. Try Save As → .docx from Word or paste text into a .txt file."
    );
  }
  return { text };
}

export function parseMarkdown(source: string): ParseResult {
  const trimmed = source.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    throw new Error("Markdown file is empty.");
  }

  const md = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: false,
  });
  const html = md.render(trimmed);
  const plainText = html
    .replace(/<[^>]*>/g, " ")
    .replace(/[`*_#>\-\[\]\(\)!|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length > 0) {
    return { text: plainText };
  }

  const fallback = trimmed
    .replace(/^---[\s\S]*?^---\s*/m, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1 ")
    .replace(/[#>*_\-\[\]()|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const out = fallback.length > 0 ? fallback : plainText;
  if (!out.trim()) {
    throw new Error(
      "This Markdown file has no extractable text. It may be empty, whitespace-only, or only non-text assets (e.g. images) with no captions."
    );
  }
  return { text: out };
}

export function parseTXT(text: string): ParseResult {
  return { text };
}

function decodePlainBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString("utf-8").replace(/^\uFEFF/, "");
  if (utf8.trim().length > 0) return utf8;
  if (buffer.length === 0) return "";
  return buffer.toString("latin1");
}

export async function parseDocument(buffer: Buffer, mimeType: string): Promise<ParseResult> {
  switch (mimeType) {
    case "application/pdf":
      return parsePDF(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/msword":
      return parseDOCX(buffer);
    case "text/markdown":
    case "text/x-markdown":
      return parseMarkdown(decodePlainBuffer(buffer));
    case "text/plain": {
      const raw = decodePlainBuffer(buffer);
      const { text } = parseTXT(raw);
      if (!text.trim()) {
        throw new Error(
          "This text file is empty, or uses an encoding we could not read as UTF-8. Save the file as UTF-8 (without BOM issues) and try again."
        );
      }
      return { text };
    }
    default:
      throw new Error(`Unsupported mime type: ${mimeType}`);
  }
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function getMimeTypeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    md: "text/markdown",
    txt: "text/plain",
  };
  return map[ext] || "text/plain";
}
