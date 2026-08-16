export interface EmbeddedChunk {
  path: string;
  startLine: number;
  text: string;
  vector: Map<string, number>;
}

export function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z0-9_]{2,}/g) ?? [];
  const grams: string[] = [];
  const compact = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (let index = 0; index < compact.length - 2; index += 1) {
    grams.push(compact.slice(index, index + 3));
  }
  return [...words, ...grams];
}

export function embedText(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const norm = Math.sqrt([...counts.values()].reduce((sum, value) => sum + value * value, 0)) || 1;
  for (const [token, value] of counts) {
    counts.set(token, value / norm);
  }
  return counts;
}

export function cosineSimilarity(left: Map<string, number>, right: Map<string, number>): number {
  let score = 0;
  const [smaller, larger] = left.size < right.size ? [left, right] : [right, left];
  for (const [token, value] of smaller) {
    const other = larger.get(token);
    if (other !== undefined) {
      score += value * other;
    }
  }
  return score;
}

export function chunkSource(text: string, linesPerChunk = 80): Array<{ startLine: number; text: string }> {
  const lines = text.split("\n");
  const chunks: Array<{ startLine: number; text: string }> = [];
  for (let index = 0; index < lines.length; index += linesPerChunk) {
    const slice = lines.slice(index, index + linesPerChunk).join("\n").trim();
    if (slice.length > 0) {
      chunks.push({ startLine: index + 1, text: slice });
    }
  }
  return chunks;
}
