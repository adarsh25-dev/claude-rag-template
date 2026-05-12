import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFileExtension, getMimeTypeFromExtension } from "@/lib/parsing";
import { captureException } from "@/lib/sentry";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "md", "txt"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
]);

export async function GET() {
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
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count: docCount } = await supabase
      .from("documents")
      .select("*", { head: true, count: "exact" })
      .eq("user_id", user.id);
    if ((docCount ?? 0) >= 5) {
      return NextResponse.json({ error: "Free tier limit reached: max 5 documents." }, { status: 403 });
    }

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
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
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
      return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const processUrl = `${origin}/api/documents/${documentId}/process`;
    const cookieHeader = request.headers.get("cookie") ?? "";
    void fetch(processUrl, {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        "content-type": "application/json",
        "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      },
    }).catch(() => undefined);

    return NextResponse.json({ document: doc }, { status: 202 });
  } catch (error) {
    captureException(error, { route: "/api/documents" });
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
