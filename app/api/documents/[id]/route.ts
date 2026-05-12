import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureException } from "@/lib/sentry";

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
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
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ document: data });
}

export async function DELETE(_: Request, { params }: Params) {
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

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();
    if (docError || !document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const storagePath = String((document.metadata as { storage_path?: string })?.storage_path ?? "");
    if (storagePath) {
      await admin.storage.from("documents").remove([storagePath]);
    }

    const { error } = await supabase.from("documents").delete().eq("id", params.id).eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureException(error, { route: "/api/documents/[id]", documentId: params.id });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
