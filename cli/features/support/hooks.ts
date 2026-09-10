import { After, Before, setDefaultTimeout } from '@cucumber/cucumber'
import type { DepWorld } from './world'

setDefaultTimeout(60_000)

Before(function (this: DepWorld) {
  this.ensureRoot()
})

After(function (this: DepWorld) {
  this.cleanup()
})
