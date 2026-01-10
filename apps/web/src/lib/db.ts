import { createClient } from "@libsql/client"

export const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

export async function initDb() {
  // Create script_cache table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS script_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_hash TEXT UNIQUE NOT NULL,
      pdf_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      total_pages INTEGER NOT NULL,
      script TEXT NOT NULL,
      audio_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create presentations table separately
  await db.execute(`
    CREATE TABLE IF NOT EXISTS presentations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pdf_url TEXT NOT NULL,
      total_pages INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}
