import { Database } from 'bun:sqlite'
import { join } from 'path'
import type { VectorChunk } from '../types'

const DB_FILENAME = '.dep-vectors.db'

export function openVectorDB(projectRoot: string): Database {
  const dbPath = join(projectRoot, DB_FILENAME)
  const db = new Database(dbPath)
  db.exec('PRAGMA journal_mode = WAL')
  return db
}

export function vectorDBExists(projectRoot: string): boolean {
  const dbPath = join(projectRoot, DB_FILENAME)
  return Bun.file(dbPath).size > 0
}

export function initDB(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_path TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      heading_path TEXT,
      content TEXT NOT NULL,
      embedding BLOB NOT NULL,
      token_count INTEGER,
      UNIQUE(doc_path, chunk_index)
    );
    CREATE TABLE IF NOT EXISTS doc_hashes (
      doc_path TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      last_indexed TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

export function getDocHash(db: Database, docPath: string): string | null {
  const row = db.query<{ content_hash: string }, [string]>(
    'SELECT content_hash FROM doc_hashes WHERE doc_path = ?'
  ).get(docPath)
  return row?.content_hash ?? null
}

export function upsertChunks(
  db: Database,
  docPath: string,
  chunks: Array<{ headingPath: string; content: string; embedding: Float32Array }>,
  contentHash: string
): void {
  const tx = db.transaction(() => {
    // Remove old chunks for this doc
    db.run('DELETE FROM chunks WHERE doc_path = ?', [docPath])

    const insert = db.prepare(
      'INSERT INTO chunks (doc_path, chunk_index, heading_path, content, embedding, token_count) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!
      const embeddingBlob = Buffer.from(chunk.embedding.buffer)
      const tokenCount = Math.ceil(chunk.content.length / 4) // rough estimate
      insert.run(docPath, i, chunk.headingPath, chunk.content, embeddingBlob, tokenCount)
    }

    // Update hash
    db.run(
      'INSERT OR REPLACE INTO doc_hashes (doc_path, content_hash, last_indexed) VALUES (?, ?, ?)',
      [docPath, contentHash, new Date().toISOString()]
    )
  })
  tx()
}

export function removeDoc(db: Database, docPath: string): void {
  db.run('DELETE FROM chunks WHERE doc_path = ?', [docPath])
  db.run('DELETE FROM doc_hashes WHERE doc_path = ?', [docPath])
}

export function getAllEmbeddings(db: Database): VectorChunk[] {
  const rows = db.query<{
    id: number
    doc_path: string
    chunk_index: number
    heading_path: string
    content: string
    embedding: Buffer
    token_count: number
  }, []>('SELECT * FROM chunks').all()

  return rows.map((row) => ({
    id: row.id,
    docPath: row.doc_path,
    chunkIndex: row.chunk_index,
    headingPath: row.heading_path ?? '',
    content: row.content,
    embedding: new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4),
    tokenCount: row.token_count,
  }))
}

export function getAllIndexedDocs(db: Database): string[] {
  return db.query<{ doc_path: string }, []>('SELECT doc_path FROM doc_hashes').all().map((r) => r.doc_path)
}

export function getMeta(db: Database, key: string): string | null {
  const row = db.query<{ value: string }, [string]>('SELECT value FROM meta WHERE key = ?').get(key)
  return row?.value ?? null
}

export function setMeta(db: Database, key: string, value: string): void {
  db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value])
}

export function hashContent(content: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(content)
  return hasher.digest('hex')
}
