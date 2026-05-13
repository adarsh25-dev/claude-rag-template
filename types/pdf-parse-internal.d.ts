declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = { text: string; numpages: number };
  function pdfParse(dataBuffer: Buffer, options?: unknown): Promise<PdfParseResult>;
  export = pdfParse;
}
