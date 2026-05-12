import { countTokens } from "gpt-tokenizer";

export interface Chunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
}

function tokenCount(text: string): number {
  return countTokens(text);
}

export interface ChunkingOptions {
  chunkSize?: number; // in tokens
  overlap?: number; // in tokens
}

export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): Chunk[] {
  const { chunkSize = 800, overlap = 200 } = options;
  const chunks: Chunk[] = [];
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  let currentChunk = "";
  let currentTokens = 0;
  let chunkIndex = 0;

  const pushChunk = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    chunks.push({
      content: trimmed,
      tokenCount: tokenCount(trimmed),
      chunkIndex: chunkIndex++,
    });
  };

  const getOverlapTail = (content: string): string => {
    const words = content.split(/\s+/).filter(Boolean);
    let total = 0;
    const overlapWords: string[] = [];
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      const wordTokens = tokenCount(` ${word}`);
      if (total + wordTokens > overlap) break;
      overlapWords.unshift(word);
      total += wordTokens;
    }
    return overlapWords.join(" ");
  };

  const consumeUnit = (unitText: string) => {
    const unit = unitText.trim();
    if (!unit) return;
    const unitTokens = tokenCount(unit);

    if (unitTokens <= chunkSize) {
      if (currentTokens + unitTokens > chunkSize && currentChunk) {
        pushChunk(currentChunk);
        const overlapTail = getOverlapTail(currentChunk);
        currentChunk = overlapTail ? `${overlapTail}\n\n${unit}` : unit;
        currentTokens = tokenCount(currentChunk);
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${unit}` : unit;
        currentTokens = tokenCount(currentChunk);
      }
      return;
    }

    const sentences = unit.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [unit];
    if (sentences.length > 1) {
      for (const sentence of sentences) {
        consumeUnit(sentence);
      }
      return;
    }

    const words = unit.split(/\s+/).filter(Boolean);
    let hardChunk = "";
    for (const word of words) {
      if (tokenCount(word) > chunkSize) {
        if (hardChunk) {
          consumeUnit(hardChunk);
          hardChunk = "";
        }
        pushChunk(word);
        continue;
      }
      const candidate = hardChunk ? `${hardChunk} ${word}` : word;
      if (tokenCount(candidate) > chunkSize && hardChunk) {
        consumeUnit(hardChunk);
        hardChunk = word;
      } else {
        hardChunk = candidate;
      }
    }
    if (hardChunk) consumeUnit(hardChunk);
  };

  for (const paragraph of paragraphs) consumeUnit(paragraph);
  if (currentChunk) pushChunk(currentChunk);

  return chunks;
}
