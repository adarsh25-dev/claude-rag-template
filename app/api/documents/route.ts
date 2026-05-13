import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFileExtension, getMimeTypeFromExtension } from "@/lib/parsing";
import { captureException } from "@/lib/sentry";
import { processDocumentById } from "@/lib/documents/process-document";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Allow full parse + embed pipeline in one request (Vercel Pro / compatible hosts). */
export const maxDuration = 300;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "md", "txt"]);

/**
 * Per-user document cap.
 * - Unset: unlimited in development (`NODE_ENV !== "production"`), max 5 in production.
 * - Set `DOCUMENTS_MAX_PER_USER` to an integer; `0` means unlimited (any environment).
 */
function getDocumentsPerUserCap(): { limit: number; unlimited: boolean } {
  const raw = process.env.DOCUMENTS_MAX_PER_USER?.trim();
  if (raw === undefined || raw === "") {
    if (process.env.NODE_ENV === "production") {
      return { limit: 5, unlimited: false };
    }
    return { limit: 0, unlimited: true };
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return { limit: 5, unlimited: false };
  if (parsed === 0) return { limit: 0, unlimited: true };
  const limit = Math.min(Math.max(1, parsed), 1_000_000);
  return { limit, unlimited: false };
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
]);

function jsonFromPostgrest(
  status: number,
  message: string,
  error: PostgrestError | null | undefined
): NextResponse {
  const body: Record<string, string> = { error: message };
  if (error?.message) body.details = error.message;
  if (error?.code) body.code = error.code;
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/documents]", error);
      return jsonFromPostgrest(500, "Failed to fetch documents", error);
    }

    return NextResponse.json({ documents: data });
  } catch (error) {
    captureException(error, { route: "GET /api/documents" });
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: "Failed to fetch documents", details: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count: docCount, error: countError } = await supabase
      .from("documents")
      .select("*", { head: true, count: "exact" })
      .eq("user_id", user.id);

    if (countError) {
      console.error("[POST /api/documents] count", countError);
      return jsonFromPostgrest(500, "Failed to count documents", countError);
    }

    const cap = getDocumentsPerUserCap();
    if (!cap.unlimited && (docCount ?? 0) >= cap.limit) {
      return NextResponse.json(
        {
          error: "Document limit reached.",
          details: `Maximum ${cap.limit} document(s) per account. Remove one from the library or set DOCUMENTS_MAX_PER_USER (integer; 0 = unlimited).`,
        },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be 10MB or less" }, { status: 400 });
    }

    const ext = getFileExtension(file.name);
    const mimeLooksText = file.type === "text/plain" || file.type === "";
    const mimeAllowed =
      ALLOWED_MIME_TYPES.has(file.type) || (mimeLooksText && (ext === "md" || ext === "txt"));
    if (!ALLOWED_EXTENSIONS.has(ext) || !mimeAllowed) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const documentId = crypto.randomUUID();
    const normalizedMimeType = getMimeTypeFromExtension(ext);
    const storagePath = `${user.id}/${documentId}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(storagePath, fileBuffer, {
        contentType: normalizedMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[POST /api/documents] storage", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    const { data: doc, error: insertError } = await admin
      .from("documents")
      .insert({
        id: documentId,
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        filename: file.name,
        file_size: file.size,
        file_type: normalizedMimeType,
        status: "processing",
        metadata: {
          storage_path: storagePath,
          progress: { stage: "uploaded", current: 0, total: 0 },
        },
      })
      .select("*")
      .single();

    if (insertError || !doc) {
      console.error("[POST /api/documents] insert", insertError);
      return jsonFromPostgrest(500, "Failed to create document", insertError ?? undefined);
    }

    const processResult = await processDocumentById(documentId);

    if (!processResult.success) {
      captureException(new Error(processResult.error), {
        route: "POST /api/documents",
        documentId,
      });
      const { data: failedDoc } = await admin
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();

      return NextResponse.json(
        {
          error: "Document was saved but search indexing failed.",
          details: processResult.error,
          document: failedDoc ?? doc,
        },
        { status: 502 }
      );
    }

    const { data: readyDoc } = await admin.from("documents").select("*").eq("id", documentId).single();

    return NextResponse.json({ document: readyDoc ?? doc }, { status: 200 });
  } catch (error) {
    captureException(error, { route: "POST /api/documents" });
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: "Failed to upload document", details: message }, { status: 500 });
  }
}
