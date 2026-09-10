import { AssertionError } from 'node:assert'

function fail(message: string, actual?: unknown, expected?: unknown): never {
  throw new AssertionError({ message, actual, expected, stackStartFn: fail })
}

export function assertTrue(condition: boolean, message: string): asserts condition {
  if (!condition) fail(message)
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) fail(`${message}\n  expected: ${format(expected)}\n  actual:   ${format(actual)}`)
}

export function assertContains(haystack: string, needle: string, message: string): void {
  if (!haystack.includes(needle)) {
    fail(`${message}\n  expected to find: ${format(needle)}\n  in:\n${indent(haystack)}`)
  }
}

export function assertNotContains(haystack: string, needle: string, message: string): void {
  if (haystack.includes(needle)) {
    fail(`${message}\n  expected NOT to find: ${format(needle)}\n  in:\n${indent(haystack)}`)
  }
}

export function assertMatches(haystack: string, pattern: RegExp, message: string): RegExpMatchArray {
  const match = haystack.match(pattern)
  if (!match) fail(`${message}\n  expected to match: ${pattern}\n  in:\n${indent(haystack)}`)
  return match
}

export function assertIncludesAll(haystack: string, needles: string[], message: string): void {
  const missing = needles.filter((n) => !haystack.includes(n))
  if (missing.length > 0) {
    fail(`${message}\n  missing: ${missing.map(format).join(', ')}\n  in:\n${indent(haystack)}`)
  }
}

function format(value: unknown): string {
  return typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value, null, 2)
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')
}
