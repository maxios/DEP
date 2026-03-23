import { readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { join } from 'path'
import type { DocspecConfig } from './types'

export function loadDocspec(root: string): DocspecConfig {
  const docspecPath = join(root, '.docspec')
  const content = readFileSync(docspecPath, 'utf-8')
  return parseYaml(content) as DocspecConfig
}
