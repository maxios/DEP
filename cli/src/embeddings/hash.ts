import type { EmbeddingProvider } from './provider'
import { termFrequencies } from '../context/tokens'

const DEFAULT_DIMENSIONS = 4096

function fnv1a(text: string, seed: number): number {
  let hash = (0x811c9dc5 ^ seed) >>> 0
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * A deterministic, dependency-free embedding: each term lights two positions of
 * a fixed-size vector, weighted by its frequency, then the vector is normalised.
 * Cosine similarity between two such vectors is a term-overlap measure.
 *
 * It runs on the machine, needs no model download and never touches the
 * network, which makes it the provider for tests and for projects that want
 * retrieval without a model. It is lexical, not semantic — the `local` and
 * `openai` providers are the ones that understand meaning.
 */
export class HashEmbeddingProvider implements EmbeddingProvider {
  readonly name: string
  readonly dimensions: number

  constructor(model?: string) {
    const dims = model ? parseInt(model, 10) : DEFAULT_DIMENSIONS
    this.dimensions = Number.isFinite(dims) && dims > 16 ? dims : DEFAULT_DIMENSIONS
    this.name = `hash:v1-${this.dimensions}`
  }

  async init(): Promise<void> {}

  async embed(texts: string[]): Promise<Float32Array[]> {
    return texts.map((text) => this.embedOne(text))
  }

  /**
   * A question embedded with knowledge of the set: terms common across the
   * set's passages weigh less, so cosine against a passage becomes a TF-IDF
   * overlap rather than a raw term count.
   */
  embedQuery(text: string, idf: (term: string) => number): Float32Array {
    return this.embedOne(text, idf)
  }

  private embedOne(text: string, weight: (term: string) => number = () => 1): Float32Array {
    const vector = new Float32Array(this.dimensions)
    for (const [term, count] of termFrequencies(text)) {
      const value = count * weight(term)
      vector[fnv1a(term, 0x9747b28c) % this.dimensions] += value
      vector[fnv1a(term, 0x85ebca6b) % this.dimensions] += value
    }
    let norm = 0
    for (let i = 0; i < vector.length; i++) norm += vector[i]! * vector[i]!
    norm = Math.sqrt(norm)
    if (norm > 0) for (let i = 0; i < vector.length; i++) vector[i] = vector[i]! / norm
    return vector
  }

  dispose(): void {}
}
