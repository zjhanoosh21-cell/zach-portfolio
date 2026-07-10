import fs from 'fs'
import path from 'path'
import { ProspectConfig } from './types'

const PROSPECTS_DIR = path.join(process.cwd(), 'prospects')

export function getAllSlugs(): string[] {
  if (!fs.existsSync(PROSPECTS_DIR)) return []
  return fs
    .readdirSync(PROSPECTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
}

export function getProspect(slug: string): ProspectConfig | null {
  const filePath = path.join(PROSPECTS_DIR, `${slug}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as ProspectConfig
  } catch {
    return null
  }
}
