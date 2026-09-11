import { sep } from 'path'

/**
 * Document paths are identifiers: they appear in frontmatter links, index
 * pages and graph keys with forward slashes on every platform. Anything that
 * derives one from the filesystem must go through here so a Windows path never
 * leaks in as `docs\reference\x.md` and fails to match `docs/reference/x.md`.
 */
export function posix(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/')
}
