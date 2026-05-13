const DEFAULT_EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5";
const DEFAULT_EMBEDDING_DIMENSIONS = 1024;

function getNvidiaBaseUrl(): string {
  const raw = process.env.NVIDIA_API_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  return raw.replace(/\/$/, "");
}

function getNvidiaApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }
  return key;
}

function getConfiguredEmbeddingModel(): string {
  return process.env.NVIDIA_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

function getEmbeddingDimensions(): number {
  const raw = process.env.NVIDIA_EMBEDDING_DIMENSIONS;
  if (raw === undefined || raw === "") {
    return DEFAULT_EMBEDDING_DIMENSIONS;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("NVIDIA_EMBEDDING_DIMENSIONS must be a positive integer");
  }
  return n;
}

/** NeMo Retriever E5 QA model family detection. */
function isNvEmbedqaE5Model(baseModelId: string): boolean {
  return baseModelId.toLowerCase().includes("nv-embedqa-e5");
}

function baseEmbeddingModelId(configured: string): string {
  return configured.replace(/-(query|passage)$/i, "");
}

function buildEmbeddingsRequestBodies(
  configuredModel: string,
  input: string | string[],
  mode: "query" | "passage"
): Record<string, unknown>[] {
  const base = baseEmbeddingModelId(configuredModel);
  const modeSuffix = mode === "query" ? "query" : "passage";

  if (isNvEmbedqaE5Model(base)) {
    // NVIDIA endpoints vary by account/catalog. Try the NeMo-style input_type form first,
    // then retry with suffix-based model ids for hosts that only expose those aliases.
    return [
      { input, model: base, input_type: mode },
      { input, model: `${base}-${modeSuffix}`, modality: "text" },
      { input, model: base, modality: "text" },
      { input, model: base },
    ];
  }

  return [{ input, model: base, dimensions: getEmbeddingDimensions() }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type EmbeddingsDataItem = {
  embedding: number[];
  index: number;
};

function parseEmbeddingsData(json: unknown): EmbeddingsDataItem[] {
  const expectedDims = getEmbeddingDimensions();
  if (!isRecord(json) || !Array.isArray(json.data)) {
    throw new Error("Invalid embeddings response: missing data array");
  }

  const items: EmbeddingsDataItem[] = [];
  for (const entry of json.data) {
    if (!isRecord(entry) || typeof entry.index !== "number" || !Array.isArray(entry.embedding)) {
      throw new Error("Invalid embeddings response: malformed data item");
    }
    const embedding: number[] = [];
    for (const v of entry.embedding) {
      if (typeof v !== "number") {
        throw new Error("Invalid embeddings response: embedding values must be numbers");
      }
      embedding.push(v);
    }
    if (embedding.length !== expectedDims) {
      throw new Error(
        `Embedding dimension mismatch: expected ${expectedDims}, got ${embedding.length}. ` +
          "Set NVIDIA_EMBEDDING_DIMENSIONS to match your NVIDIA_EMBEDDING_MODEL output, or migrate the vector column."
      );
    }
    items.push({ embedding, index: entry.index });
  }

  return items.sort((a, b) => a.index - b.index);
}

async function callNvidiaEmbeddings(
  input: string | string[],
  mode: "query" | "passage"
): Promise<EmbeddingsDataItem[]> {
  const url = `${getNvidiaBaseUrl()}/embeddings`;
  const configuredModel = getConfiguredEmbeddingModel();
  const requestBodies = buildEmbeddingsRequestBodies(configuredModel, input, mode);
  const attemptErrors: string[] = [];

  for (let i = 0; i < requestBodies.length; i += 1) {
    const body = requestBodies[i];
    const modelSent = typeof body.model === "string" ? body.model : configuredModel;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getNvidiaApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    let json: unknown;
    let isJson = true;
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      isJson = false;
      json = undefined;
    }

    if (res.ok) {
      if (!isJson) {
        throw new Error(`Embeddings request succeeded but response was not JSON (model ${modelSent})`);
      }
      return parseEmbeddingsData(json);
    }

    let message = `Embeddings request failed with status ${res.status}`;
    if (isJson && isRecord(json) && isRecord(json.error) && typeof json.error.message === "string") {
      message = json.error.message;
    } else if (isJson && isRecord(json) && typeof json.message === "string") {
      message = json.message;
    } else if (isJson && isRecord(json) && typeof json.detail === "string") {
      message = json.detail;
    } else if (raw.length > 0 && raw.length < 800) {
      message = `${message}: ${raw}`;
    }

    const retryableModelMismatch =
      res.status === 404 ||
      res.status === 400 ||
      (!isJson && res.status >= 400) ||
      /input_type|model|not found|unsupported/i.test(message);

    const hasNext = i < requestBodies.length - 1;
    if (retryableModelMismatch && hasNext) {
      attemptErrors.push(`model=${modelSent} status=${res.status} message=${message}`);
      continue;
    }

    if (!isJson) {
      const hint404 =
        res.status === 404
          ? ` The integrate host often returns HTML here if the model is not on POST /v1/embeddings (e.g. chat-only), or the id is wrong. Default catalog embedding: ${DEFAULT_EMBEDDING_MODEL} (see NeMo Retriever docs). Requested model: ${modelSent}.`
          : "";
      const prior = attemptErrors.length > 0 ? ` Prior attempts: ${attemptErrors.join(" | ")}` : "";
      throw new Error(`Embeddings request failed: response was not JSON (HTTP ${res.status}).${hint404}${prior}`);
    }

    const prior = attemptErrors.length > 0 ? ` Prior attempts: ${attemptErrors.join(" | ")}` : "";
    throw new Error(`${message} (model: ${modelSent}).${prior}`);
  }

  throw new Error("Embeddings request failed after exhausting model compatibility fallbacks");
}

export async function getEmbedding(text: string): Promise<number[]> {
  const items = await callNvidiaEmbeddings(text, "query");
  const first = items[0];
  if (!first) {
    throw new Error("No embedding returned");
  }
  return first.embedding;
}

/** NVIDIA integrate is stricter than OpenAI on batch size; keep small to avoid 400s. */
const EMBEDDING_UPSTREAM_BATCH_SIZE = 32;

function sanitizeEmbeddingInputs(texts: string[]): string[] {
  return texts.map((t) => {
    const s = t.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();
    return s.length > 0 ? s : " ";
  });
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const sanitized = sanitizeEmbeddingInputs(texts);
  const out: number[][] = [];
  for (let i = 0; i < sanitized.length; i += EMBEDDING_UPSTREAM_BATCH_SIZE) {
    const slice = sanitized.slice(i, i + EMBEDDING_UPSTREAM_BATCH_SIZE);
    const items = await callNvidiaEmbeddings(slice, "passage");
    out.push(...items.map((d) => d.embedding));
  }
  return out;
}
