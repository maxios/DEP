import type { GameTemplate } from './index'

/** What test, if any, a change needs. */
export const tester: GameTemplate = {
  name: 'tester',
  title: 'Tester agent',
  teaches: 'which test a change needs: the smallest one that guards it, a contract where others depend on it, none where it adds nothing',
  id: 'game.tester',
  feature: 'Testing a change',
  scenario: 'A change is given the test it needs',
  given: 'a <change> change to <surface> code, of <risk> risk, where coverage is <coverage> and the tests are <tests>',
  when: "the tester's choice is applied",
  dimensions: [
    { name: 'change', values: ['bugfix', 'feature', 'refactor', 'config', 'dependency'] },
    { name: 'surface', values: ['logic', 'api', 'ui'] },
    { name: 'risk', values: ['low', 'high'] },
    { name: 'coverage', values: ['none', 'partial', 'good'] },
    { name: 'tests', values: ['steady', 'flaky'] },
  ],
  options: ['unit-test', 'integration-test', 'e2e-test', 'contract-test', 'quarantine-flaky', 'skip'],
  rules: [
    { when: { tests: 'flaky' }, then: 'quarantine-flaky', why: 'its tests are flaky: quarantine them before trusting a new one' },
    { when: { change: 'config', risk: 'low' }, then: 'skip', why: 'a low-risk configuration change' },
    { when: { change: 'refactor', coverage: 'good' }, then: 'skip', why: 'good coverage already guards a refactor' },
    { when: { surface: 'api', change: ['feature', 'dependency'] }, then: 'contract-test', why: 'a changed API needs a contract its consumers can rely on' },
    { when: { surface: 'ui', risk: 'high' }, then: 'e2e-test', why: 'a high-risk change to the UI is tested end to end' },
    { when: { surface: 'api' }, then: 'integration-test', why: 'an API is tested through its real boundaries' },
  ],
  otherwise: { then: 'unit-test', why: 'otherwise, the smallest test that reproduces it' },
}
