import type { VectorizationConfig } from '../types'

export interface EmbeddingProvider {
  readonly name: string
  readonly dimensions: number
  init(): Promise<void>
  embed(texts: string[]): Promise<Float32Array[]>
  dispose(): void
}

export async function createProvider(config: VectorizationConfig): Promise<EmbeddingProvider> {
  if (config.provider === 'openai') {
    const { OpenAIEmbeddingProvider } = await import('./openai')
    return new OpenAIEmbeddingProvider(config.model)
  }
  const { LocalEmbeddingProvider } = await import('./local')
  return new LocalEmbeddingProvider(config.model)
}
