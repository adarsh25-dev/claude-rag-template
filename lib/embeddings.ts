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

/** NeMo Retriever E5 QA: same model id + `input_type` query vs passage (hosted integrate rejects `-query` model names). */
function usesNvEmbedqaE5InputType(baseModelId: string): boolean {
  return baseModelId.toLowerCase().includes("nv-embedqa-e5");
}

function baseEmbeddingModelId(configured: string): string {
  return configured.replace(/-(query|passage)$/i, "");
}

function buildEmbeddingsRequestBody(
  configuredModel: string,
  input: string | string[],
  mode: "query" | "passage"
): Record<string, unknown> {
  const base = baseEmbeddingModelId(configuredModel);
  const body: Record<string, unknown> = { model: base, input };

  if (usesNvEmbedqaE5InputType(base)) {
    body.input_type = mode;
    body.modality = "text";
    return body;
  }

  body.dimensions = getEmbeddingDimensions();
  return body;
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
  const body = buildEmbeddingsRequestBody(configuredModel, input, mode);

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
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    let modelSent = typeof body.model === "string" ? body.model : configuredModel;
    if (typeof body.input_type === "string") {
      modelSent += `, input_type=${body.input_type}`;
    }
    const hint404 =
      res.status === 404
        ? ` The integrate host often returns HTML here if the model is not on POST /v1/embeddings (e.g. chat-only), or the id is wrong. Default catalog embedding: ${DEFAULT_EMBEDDING_MODEL} (see NeMo Retriever docs). Requested model: ${modelSent}.`
        : "";
    throw new Error(`Embeddings request failed: response was not JSON (HTTP ${res.status}).${hint404}`);
  }

  if (!res.ok) {
    let message = `Embeddings request failed with status ${res.status}`;
    if (isRecord(json) && isRecord(json.error) && typeof json.error.message === "string") {
      message = json.error.message;
    }
    throw new Error(message);
  }

  return parseEmbeddingsData(json);
}

export async function getEmbedding(text: string): Promise<number[]> {
  const items = await callNvidiaEmbeddings(text, "query");
  const first = items[0];
  if (!first) {
    throw new Error("No embedding returned");
  }
  return first.embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const items = await callNvidiaEmbeddings(texts, "passage");
  return items.map((d) => d.embedding);
}
