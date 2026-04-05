// services/embedding.ts
// Singleton embedding service using ExecuTorch's TextEmbeddingsModule.
// Hardcoded to all-MiniLM-L6-V2 (384d, ~25MB).
// Adapted from rag-mobile/utils/ExecuTorchEmbeddingService.ts.

import { TextEmbeddingsModule, ALL_MINILM_L6_V2 } from 'react-native-executorch'

let module: TextEmbeddingsModule | null = null
let loadInFlight = false

export const MODEL_ID = 'et-all-minilm-l6-v2'
export const MODEL_NAME = 'all-MiniLM-L6-V2'
export const MODEL_SIZE_MB = 25
export const EMBEDDING_DIM = 384

function normalizeVector(v: number[]): number[] {
  let norm = 0
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i]
  norm = Math.sqrt(norm) || 1
  const out = new Array(v.length)
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm
  return out
}

export async function loadModel(
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (module) return
  if (loadInFlight) throw new Error('[Embedding] Load already in progress')

  loadInFlight = true
  try {
    const m = new TextEmbeddingsModule()
    await m.load(
      {
        modelSource: ALL_MINILM_L6_V2.modelSource,
        tokenizerSource: ALL_MINILM_L6_V2.tokenizerSource,
      },
      onProgress ?? (() => {}),
    )
    module = m
  } finally {
    loadInFlight = false
  }
}

export async function embed(text: string): Promise<number[]> {
  if (!module) throw new Error('[Embedding] Model not loaded')

  const truncated = text.length > 1500 ? text.substring(0, 1500) : text
  const raw = await module.forward(truncated)
  const vector = Array.from(raw as ArrayLike<number>)

  if (vector.length === 0 || vector.some((v) => !Number.isFinite(v))) {
    throw new Error('[Embedding] Invalid embedding vector')
  }

  return normalizeVector(vector)
}

export async function embedBatch(
  texts: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<number[][]> {
  if (!module) throw new Error('[Embedding] Model not loaded')

  const vectors: number[][] = []
  for (let i = 0; i < texts.length; i++) {
    onProgress?.(i, texts.length)
    const text = texts[i]
    if (!text || text.trim().length === 0) continue
    try {
      vectors.push(await embed(text))
    } catch {
      // Skip failed embeddings, continue with rest
    }
  }
  onProgress?.(texts.length, texts.length)

  if (vectors.length === 0) {
    throw new Error('[Embedding] No valid embeddings generated')
  }
  return vectors
}

export function unload(): void {
  if (module) {
    try {
      module.delete()
    } catch {}
    module = null
  }
}

export function isLoaded(): boolean {
  return module !== null
}
