import MarkdownIt from "markdown-it";

export interface ParseResult {
  text: string;
  pageCount?: number;
}

export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  const { default: pdfParse } = await import("pdf-parse");
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
  };
}

export async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value.trim(),
  };
}

export function parseMarkdown(text: string): ParseResult {
  const md = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: false,
  });
  const html = md.render(text);
  const plainText = html
    .replace(/<[^>]*>/g, " ")
    .replace(/[`*_#>\-\[\]\(\)!|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { text: plainText };
}

export function parseTXT(text: string): ParseResult {
  return { text };
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string
): Promise<ParseResult> {
  switch (mimeType) {
    case "application/pdf":
      return parsePDF(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/msword":
      return parseDOCX(buffer);
    case "text/markdown":
    case "text/x-markdown":
      return parseMarkdown(buffer.toString("utf-8"));
    case "text/plain":
      return parseTXT(buffer.toString("utf-8"));
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
