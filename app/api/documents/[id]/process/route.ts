import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processDocumentById } from "@/lib/documents/process-document";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const documentId = params.id;

  const internalKey = request.headers.get("x-internal-key")?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isInternal = Boolean(internalKey && serviceRole && internalKey === serviceRole);
  if (!isInternal && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDocumentById(documentId);

  if (!result.success) {
    if (result.error === "Document not found") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to process document", details: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
