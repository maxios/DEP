import { join } from 'path'
import type { EmbeddingProvider } from './provider'
import { depHome, preloadOnnxRuntime } from './native'

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2'

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name: string
  readonly dimensions = 384
  private pipeline: any = null
  private modelId: string

  constructor(model?: string) {
    this.modelId = model || DEFAULT_MODEL
    this.name = `local:${this.modelId}`
  }

  async init(): Promise<void> {
    await preloadOnnxRuntime()
    const { pipeline, env } = await import('@huggingface/transformers')
    // Disable local model check warning
    env.allowLocalModels = false
    // Downloaded models live under DEP's home rather than next to the library,
    // which is read-only (and lost between runs) inside the standalone binary.
    env.cacheDir = join(depHome(), 'cache', 'models')
    this.pipeline = await pipeline('feature-extraction', this.modelId, {
      dtype: 'fp32',
    })
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    if (!this.pipeline) throw new Error('Provider not initialized. Call init() first.')

    const results: Float32Array[] = []
    for (const text of texts) {
      const output = await this.pipeline(text, { pooling: 'mean', normalize: true })
      results.push(new Float32Array(output.data))
    }
    return results
  }

  dispose(): void {
    this.pipeline = null
  }
}
