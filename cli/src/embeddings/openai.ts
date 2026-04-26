import type { EmbeddingProvider } from './provider'

const DEFAULT_MODEL = 'text-embedding-3-small'
const API_URL = 'https://api.openai.com/v1/embeddings'
const BATCH_SIZE = 2048

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name: string
  readonly dimensions: number
  private apiKey: string = ''
  private model: string

  constructor(model?: string) {
    this.model = model || DEFAULT_MODEL
    this.name = `openai:${this.model}`
    // text-embedding-3-small = 1536, text-embedding-3-large = 3072
    this.dimensions = this.model.includes('large') ? 3072 : 1536
  }

  async init(): Promise<void> {
    this.apiKey = process.env.DEP_OPENAI_API_KEY || process.env.OPENAI_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Set DEP_OPENAI_API_KEY or OPENAI_API_KEY environment variable.')
    }
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    if (!this.apiKey) throw new Error('Provider not initialized. Call init() first.')

    const results: Float32Array[] = []

    // Process in batches
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: this.model, input: batch }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI API error (${response.status}): ${error}`)
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>
      }

      for (const item of data.data) {
        results.push(new Float32Array(item.embedding))
      }
    }

    return results
  }

  dispose(): void {
    this.apiKey = ''
  }
}
