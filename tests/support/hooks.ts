import { After, setDefaultTimeout } from '@cucumber/cucumber'
import type { DepWorld } from './world.ts'

// Every step shells out to the CLI, so allow for a cold bun start.
setDefaultTimeout(30_000)

After(function (this: DepWorld, { result }) {
  // Keep the fixture around when a scenario fails, so it can be inspected.
  if (result?.status !== 'FAILED') this.cleanup()
  else this.attach(`Fixture project kept at: ${this.project.root}`, 'text/plain')
})
