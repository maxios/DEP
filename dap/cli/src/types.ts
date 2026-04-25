export type NodeType = 'observe' | 'decide' | 'act' | 'delegate'
export type ActionType = 'tool_call' | 'document' | 'intent'
export type ObserveMethod = 'tool_call' | 'prompt' | 'eval' | 'dep_lookup'
export type Confidence = 'high' | 'medium' | 'low' | 'stale'
export type Lifecycle = 'FRESH' | 'AGING' | 'STALE'

export const NODE_SYMBOLS: Record<string, NodeType> = {
  '[?]': 'observe',
  '[>]': 'decide',
  '[!]': 'act',
  '[@]': 'delegate',
}

export const NODE_TYPE_SYMBOLS: Record<NodeType, string> = {
  observe: '[?]',
  decide: '[>]',
  act: '[!]',
  delegate: '[@]',
}

export interface DapTriggerPattern {
  pattern?: string
  intent?: string
}

export interface DapMetadata {
  id: string
  version: number
  trigger: string
  trigger_patterns?: Array<string | { intent: string }>
  audience: string[]
  owner: string
  created: string
  last_verified: string
  confidence: Confidence
  depends_on: string[]
  tags: string[]
  entry_node: string
}

export interface DecideCondition {
  condition: string
  next: string
}

export interface DapNode {
  id: string
  type: NodeType
  description: string
  // Observe fields
  method?: ObserveMethod
  tool?: string
  args?: Record<string, unknown>
  prompt?: string
  expr?: string
  outputs?: string[]
  next?: string
  // Decide fields
  conditions?: DecideCondition[]
  // Act fields
  action_type?: ActionType
  ref?: string
  intent?: string
  params?: Record<string, unknown>
  summary?: string
  on_success?: string
  on_failure?: string
  terminal?: boolean
  // Delegate fields
  delegate_to?: string
  pass_context?: Record<string, unknown>
  on_return?: string
}

export interface DapTree {
  path: string
  metadata: DapMetadata
  nodes: Map<string, DapNode>
  lifecycle: Lifecycle
}

export interface DapEdge {
  source: string
  target: string
  tree: string
}

export interface DapGraph {
  trees: Map<string, DapTree>
  delegations: DapEdge[]
  orphanNodes: Array<{ tree: string; node: string }>
  cycles: string[][]
}

export interface IntentDef {
  id: string
  description: string
  required_params: string[]
}

export interface DapspecConfig {
  dap_version: string
  project: {
    name: string
    trees_root: string
    description?: string
  }
  dep_integration?: {
    docspec_path?: string
    resolve_dep_refs?: boolean
  }
  intent_registry?: IntentDef[]
  governance: {
    review_cadence: number
    fallback_owner: string
  }
}
