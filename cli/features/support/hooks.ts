import { After, Before, setDefaultTimeout, setWorldConstructor } from '@cucumber/cucumber'
import { DepWorld } from './world'

setWorldConstructor(DepWorld)

setDefaultTimeout(60_000)

Before(function (this: DepWorld) {
  this.ensureRoot()
})

After(function (this: DepWorld) {
  this.cleanup()
})
