import type { FileStore } from "../file/interface.ts";
import { walkWorkspaceFiles } from "../file/walk.ts";
import {
  chunkSource,
  cosineSimilarity,
  embedText,
  type EmbeddedChunk,
} from "./lexical.ts";

const INDEXABLE = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".md", ".json"]);

export interface RetrievalHit {
  path: string;
  startLine: number;
  score: number;
  preview: string;
}

export async function semanticSearch(
  files: FileStore,
  query: string,
  maxResults = 8,
): Promise<RetrievalHit[]> {
  const queryVector = embedText(query);
  const scored: RetrievalHit[] = [];

  for (const workspace of files.roots()) {
    for await (const relative of walkWorkspaceFiles(workspace.root, workspace.root)) {
      if (![...INDEXABLE].some((ext) => relative.endsWith(ext))) {
        continue;
      }
      const logical =
        workspace.root === files.root ? relative.replaceAll("\\", "/") : `${workspace.name}:${relative.replaceAll("\\", "/")}`;
      let content: string;
      try {
        content = await files.read(logical);
      } catch {
        continue;
      }
      for (const chunk of chunkSource(content)) {
        const score = cosineSimilarity(queryVector, embedText(chunk.text));
        if (score <= 0) {
          continue;
        }
        scored.push({
          path: logical,
          startLine: chunk.startLine,
          score,
          preview: chunk.text.replace(/\s+/g, " ").slice(0, 180),
        });
      }
    }
  }

  return scored.sort((left, right) => right.score - left.score).slice(0, maxResults);
}

export type { EmbeddedChunk };
