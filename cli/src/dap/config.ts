import { readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { join } from 'path'
import type { DapspecConfig } from './types'

export function loadDapspec(root: string): DapspecConfig {
  const dapspecPath = join(root, '.dapspec')
  const content = readFileSync(dapspecPath, 'utf-8')
  return parseYaml(content) as DapspecConfig
}
