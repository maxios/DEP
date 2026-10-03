import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { DEFAULT_CORE_PATH, loadCore, readPin } from '../src/vendor/core'
import { sha256 } from '../src/vendor/core'

const UPSTREAM = join(import.meta.dir, '..', '..', '..', '..', '..', 'intel-loop', 'code', 'maze-core.js')

describe('the vendored maze core', () => {
  test('matches its pin', () => {
    expect(sha256(readFileSync(DEFAULT_CORE_PATH))).toBe(readPin().sha256)
  })

  test('loads and reports the pinned version', () => {
    expect(loadCore().VERSION).toBe(readPin().version)
  })

  // Only where intel-loop is checked out beside this repo; CI has no sibling.
  test.skipIf(!existsSync(UPSTREAM))('has not drifted from intel-loop', () => {
    const upstream = sha256(readFileSync(UPSTREAM))
    if (upstream !== readPin().sha256) {
      throw new Error(
        `intel-loop's maze-core.js has moved (${upstream.slice(0, 12)}…) since it was vendored ` +
        `(${readPin().sha256.slice(0, 12)}…). Re-vendor it and update the pin deliberately — ` +
        `every number this engine reports was measured against the pinned core.`
      )
    }
  })
})
