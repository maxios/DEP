import type { GameTemplate } from './index'

const BREAKING = ['remove-field', 'rename-field', 'change-type']

/** How a change to an API reaches the people who use it. */
export const apiChange: GameTemplate = {
  name: 'api-change',
  title: 'API author agent',
  teaches: 'how an API change ships: never break an unversioned API others rely on, version what breaks for outsiders, deprecate before removing, move data before code',
  id: 'game.api-change',
  feature: 'Changing an API',
  scenario: 'A change to an API is shipped the right way',
  given: 'a <change> on an API that is <versioning>, with <consumers> consumers, whose data is <data>',
  when: "the author's choice is applied",
  dimensions: [
    { name: 'change', values: ['add-field', 'new-endpoint', 'remove-field', 'rename-field', 'change-type'] },
    { name: 'versioning', values: ['unversioned', 'versioned'] },
    { name: 'consumers', values: ['no', 'internal', 'external'] },
    { name: 'data', values: ['as-is', 'migrated'] },
  ],
  options: ['ship', 'migrate-then-ship', 'deprecate-first', 'add-version', 'refuse'],
  rules: [
    { when: { change: BREAKING, consumers: 'external', versioning: 'unversioned' }, then: 'refuse', why: 'a breaking change to an unversioned API others depend on' },
    { when: { change: BREAKING, consumers: 'external' }, then: 'add-version', why: 'a breaking change for outside consumers goes in a new version' },
    { when: { change: ['remove-field', 'rename-field'], consumers: 'internal' }, then: 'deprecate-first', why: 'internal consumers are warned before a field goes' },
    { when: { data: 'migrated' }, then: 'migrate-then-ship', why: 'the data moves before the code that needs it' },
  ],
  otherwise: { then: 'ship', why: 'otherwise it ships' },
}
