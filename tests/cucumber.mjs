const FEATURES = '../docs/user-stories/features'

/**
 * Flows whose scenarios have step definitions today. The rest of the set is
 * still runnable with the `all` profile, where it reports as undefined.
 */
const IMPLEMENTED = [
  'flow-02-point-the-toolchain-at-a-project',
  'flow-03-inspect-the-documentation-graph',
  'flow-04-validate-documents-and-graph-integrity',
  'flow-05-query-documents-by-metadata',
  'flow-06-find-documents-by-keyword',
  'flow-09-trace-what-points-at-a-document',
  'flow-13-change-a-document-s-metadata',
  'flow-14-re-verify-documents-in-bulk',
  'flow-15-curate-a-document-s-tags',
  'flow-16-declare-how-documents-relate',
  'flow-18-resolve-a-request-to-a-decision-tree',
  'flow-19-traverse-a-decision-tree-one-node-at-a-time',
  'flow-20-visualise-a-decision-tree',
  'flow-21-validate-the-decision-trees',
].map((flow) => `${FEATURES}/${flow}.feature`)

const common = {
  import: ['support/*.ts', 'steps/*.ts'],
  format: ['progress-bar', 'summary', 'html:reports/cucumber.html'],
  formatOptions: { snippetInterface: 'async-await' },
  parallel: 4,
}

export default {
  ...common,
  paths: IMPLEMENTED,
  tags: 'not @wip and not @later',
}

/** Every flow, including the ones with no step definitions yet. */
export const all = {
  ...common,
  paths: [`${FEATURES}/*.feature`],
  tags: 'not @wip and not @later',
}

/** Only the scenarios parked as assumed-behaviour. */
export const wip = {
  ...common,
  paths: [`${FEATURES}/*.feature`],
  tags: '@wip or @later',
}
