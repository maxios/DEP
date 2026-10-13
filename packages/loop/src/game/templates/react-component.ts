import type { GameTemplate } from './index'

/** How a React component should be shaped: pure where it can be, containers where data and devices are reached. */
export const reactComponent: GameTemplate = {
  name: 'react-component',
  title: 'React component agent',
  teaches: 'how to shape a component: data and devices only in containers, copy out of the JSX, logic in hooks, shared state lifted, reused components memoized',
  id: 'game.react-component',
  feature: 'Shaping a React component',
  scenario: 'A component is given the shape it needs',
  given: 'a component whose data is <data>, whose device access is <device>, whose state is <state>, whose copy is <copy>, whose logic is <logic>, used <reuse>',
  when: "the author's choice is applied",
  dimensions: [
    { name: 'data', values: ['none', 'fetched'] },
    { name: 'device', values: ['none', 'used'] },
    { name: 'state', values: ['none', 'local', 'shared'] },
    { name: 'copy', values: ['none', 'inline'] },
    { name: 'logic', values: ['light', 'heavy'] },
    { name: 'reuse', values: ['once', 'many'] },
  ],
  options: ['pure-component', 'container', 'extract-hook', 'move-copy', 'lift-state', 'memoize'],
  rules: [
    { when: { data: 'fetched' }, then: 'container', why: 'data is fetched only in containers' },
    { when: { device: 'used' }, then: 'container', why: 'the device is reached only from containers' },
    { when: { copy: 'inline' }, then: 'move-copy', why: 'text lives in content files, never inline in the JSX' },
    { when: { state: 'shared' }, then: 'lift-state', why: 'shared state belongs above the component' },
    { when: { logic: 'heavy' }, then: 'extract-hook', why: 'heavy logic moves out of the JSX into a hook' },
    { when: { reuse: 'many' }, then: 'memoize', why: 'a component used in many places is memoized' },
  ],
  otherwise: { then: 'pure-component', why: 'otherwise it stays pure: props in, JSX out' },
}
