import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { retrieveChunks } from "@/lib/retrieval";
import { buildRAGPrompt } from "@/lib/prompts";
import { captureException } from "@/lib/sentry";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function normalizeRequestedDocumentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id) continue;
    out.push(id);
  }
  return Array.from(new Set(out));
}

const nvidia = createOpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: process.env.NVIDIA_API_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      messages: ChatMessage[];
      documentIds?: string[];
    };

    const latestUserMessage = [...(body.messages || [])].reverse().find((message) => message.role === "user");
    if (!latestUserMessage?.content?.trim()) {
      return Response.json({ error: "No user message found." }, { status: 400 });
    }

    const requestedIds = normalizeRequestedDocumentIds(body.documentIds);
    const { data: readyDocs } = await supabase
      .from("documents")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "ready");

    const readyIds = (readyDocs ?? []).map((doc) => doc.id);
    const readyIdSet = new Set(readyIds);
    const requestedReadyIds = requestedIds.filter((id) => readyIdSet.has(id));

    // Empty request => all ready docs.
    // If user-selected ids cover all ready docs (common "All documents" UI path),
    // skip filtering so retrieval can't accidentally get scoped to stale/non-ready ids.
    const normalizedDocumentIds =
      requestedReadyIds.length > 0 && requestedReadyIds.length < readyIds.length
        ? requestedReadyIds
        : undefined;

    const chunks = await retrieveChunks(latestUserMessage.content, {
      userId: user.id,
      documentIds: normalizedDocumentIds,
      topK: 5,
      threshold: 0.65,
    });

    const prompt = buildRAGPrompt(latestUserMessage.content, chunks);

    const result = streamText({
      model: nvidia(process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro"),
      system: prompt.system,
      prompt: prompt.user,
      temperature: 0.2,
    });

    const stream = result.toDataStreamResponse();
    const headers = new Headers(stream.headers);
    headers.set(
      "x-rag-sources",
      encodeURIComponent(
        JSON.stringify(
          chunks.map((chunk, i) => ({
            source: i + 1,
            ...chunk,
          }))
        )
      )
    );
    headers.set("x-rag-source-count", String(chunks.length));
    return new Response(stream.body, {
      status: stream.status,
      headers,
    });
  } catch (error) {
    captureException(error, { route: "/api/chat" });
    console.error("Chat API error:", error);
    return Response.json(
      {
        error: "I hit an issue while generating a response. Please try again.",
      },
      { status: 500 }
    );
  }
}
