import { Given, Then } from '@cucumber/cucumber'
import { assertContains, assertEqual, assertTrue } from '../support/expect.ts'
import type { DepWorld } from '../support/world.ts'

/** Path of the file a Given put in front of the following When. */
export const SUBJECT_FILE = 'subject-file'

/**
 * Some features say what I am told rather than quoting it — "which nodes are
 * unreachable" instead of the message itself. A feature registers those
 * phrasings here; anything unregistered is expected in the output verbatim.
 */
export const TOLD = new Map<string, (world: DepWorld) => void>()

Then('the request exits successfully', function (this: DepWorld) {
  assertEqual(this.lastResult.exitCode, 0, `Expected a successful exit.\n${this.output}`)
})

Then('the request exits unsuccessfully', function (this: DepWorld) {
  assertTrue(this.lastResult.exitCode !== 0, `Expected an unsuccessful exit.\n${this.output}`)
})

// A regular expression, not {string}: several of the quoted messages contain
// quotes of their own ("Invalid ISO 8601: \"last Tuesday\"").
Then(/^I am told "(.+)"$/, function (this: DepWorld, message: string) {
  const registered = TOLD.get(message)
  if (registered) {
    registered(this)
    return
  }
  assertContains(this.output, message, 'Expected that message in the output.')
})

Given('a markdown file with no DEP metadata', function (this: DepWorld) {
  this.project.seedStandard()
  const path = 'docs/reference/plain-notes.md'
  this.project.addNonDepFrontmatter(path)
  this.note(SUBJECT_FILE, path)
})

/**
 * Shared by the "change several fields" and "add several tags" scenarios:
 * both mean "what I just declared is what the file now carries". The step
 * that made the change records what to expect under `expected-on-disk`.
 */
Then('both are recorded on the document', function (this: DepWorld) {
  const metadata = this.project.metadataOf(this.recall<string>(SUBJECT_FILE))
  for (const [field, value] of this.recall<Array<[string, string | string[]]>>('expected-on-disk')) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        assertTrue(
          (metadata[field] as string[]).includes(entry),
          `Expected "${entry}" among the recorded ${field}: ${JSON.stringify(metadata[field])}`,
        )
      }
    } else {
      assertEqual(String(metadata[field]), value, `Expected ${field} on disk.`)
    }
  }
})

/** The step that acted recorded the file's contents under `file-before`. */
Then('the document is left unchanged', function (this: DepWorld) {
  assertEqual(
    this.project.read(this.recall<string>(SUBJECT_FILE)),
    this.recall<string>('file-before'),
    'Expected the file to be untouched.',
  )
})
