export interface DepLink {
  target: string
  rel: string
}

export interface DepMetadata {
  type: string
  audience: string[]
  owner: string
  created: string
  last_verified: string
  confidence: 'high' | 'medium' | 'low' | 'stale'
  depends_on: string[]
  tags: string[]
  links?: DepLink[]
  superseded_by?: string
  review_trigger?: string
  participants?: string[]
}

export interface DepEdge {
  source: string
  target: string
  rel: string
}

export interface DepNode {
  path: string
  metadata: DepMetadata
  forwardLinks: DepEdge[]
  backlinks: DepEdge[]
  lifecycle: 'FRESH' | 'AGING' | 'STALE'
}

export interface DepGraph {
  nodes: Map<string, DepNode>
  edges: DepEdge[]
  orphans: string[]
  cycles: string[][]
}

export interface AudienceConfig {
  id: string
  name: string
  goal: string
  context: string
  entry_point: string
  vocabulary_level: string
  time_budget: string
  success_criteria: string
}

export interface DocspecConfig {
  dep_version: string
  project: {
    name: string
    docs_root: string
    description?: string
  }
  audiences: AudienceConfig[]
  architecture: {
    directory_map: Record<string, string>
    require_index_files?: boolean
    link_style?: string
  }
  governance: {
    ownership_strategy: string
    fallback_owner: string
    review_cadence: Record<string, number>
  }
  generation: {
    ai_provider: string
    require_human_review: boolean
  }
  custom_types?: Array<{ id: string; extends: string; additional_required_patterns: string[] }>
  custom_relationships?: Array<{ id: string; meaning: string; inverse?: string }>
}
