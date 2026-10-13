import type { GameTemplate } from './index'

/** What a reviewer does with a pull request. */
export const codeReviewer: GameTemplate = {
  name: 'code-reviewer',
  title: 'Code reviewer agent',
  teaches: 'what to do with a change under review: send back what is broken, bring a person in where it matters, split what is too big, ask for the tests a public change needs',
  id: 'game.code-reviewer',
  feature: 'Reviewing a change',
  scenario: 'A change under review is handled',
  given: 'a <size> change to <area> code, with tests <tests>, a <api> interface and CI <ci>',
  when: "the reviewer's choice is applied",
  dimensions: [
    { name: 'size', values: ['small', 'large'] },
    { name: 'area', values: ['ordinary', 'auth', 'money'] },
    { name: 'tests', values: ['added', 'unchanged', 'removed'] },
    { name: 'api', values: ['internal', 'public'] },
    { name: 'ci', values: ['green', 'red'] },
  ],
  options: ['approve', 'request-changes', 'ask-for-tests', 'split', 'escalate'],
  rules: [
    { when: { ci: 'red' }, then: 'request-changes', why: 'CI is red' },
    { when: { tests: 'removed' }, then: 'request-changes', why: 'tests were removed' },
    { when: { area: ['auth', 'money'] }, then: 'escalate', why: 'it touches auth or money: a person signs off' },
    { when: { size: 'large' }, then: 'split', why: 'a large change is split before it is reviewed' },
    { when: { api: 'public', tests: 'unchanged' }, then: 'ask-for-tests', why: 'a public interface changed without new tests' },
  ],
  otherwise: { then: 'approve', why: 'otherwise it is approved' },
}
