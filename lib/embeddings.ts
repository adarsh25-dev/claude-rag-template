const EMBEDDING_DIMENSIONS = 1536;

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

function getEmbeddingModel(): string {
  return process.env.NVIDIA_EMBEDDING_MODEL ?? "text-embedding-3-small";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type EmbeddingsDataItem = {
  embedding: number[];
  index: number;
};

function parseEmbeddingsData(json: unknown): EmbeddingsDataItem[] {
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
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}. ` +
          "Set NVIDIA_EMBEDDING_MODEL to a model that returns 1536 dimensions, or migrate the vector column."
      );
    }
    items.push({ embedding, index: entry.index });
  }

  return items.sort((a, b) => a.index - b.index);
}

async function callNvidiaEmbeddings(input: string | string[]): Promise<EmbeddingsDataItem[]> {
  const url = `${getNvidiaBaseUrl()}/embeddings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getNvidiaApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getEmbeddingModel(),
      input,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Embeddings request failed: could not parse response (status ${res.status})`);
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
  const items = await callNvidiaEmbeddings(text);
  const first = items[0];
  if (!first) {
    throw new Error("No embedding returned");
  }
  return first.embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const items = await callNvidiaEmbeddings(texts);
  return items.map((d) => d.embedding);
}
