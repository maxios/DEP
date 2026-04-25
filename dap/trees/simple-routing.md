---
dap:
  id: simple-routing
  version: 1
  trigger: "determine the appropriate response channel for a request"
  audience: [ai-agent]
  owner: "@dap-core"
  created: 2026-04-25T12:00:00+02:00
  last_verified: 2026-04-25T12:00:00+02:00
  confidence: high
  depends_on: []
  tags: [example, routing, minimal]
  entry_node: check-urgency
---

# Simple Request Routing

A minimal DAP tree demonstrating the core pattern: observe, decide, act.

## check-urgency [?]

Determine the urgency level of the incoming request.

- **method**: prompt
- **prompt**: "Is this request urgent (blocking work) or normal priority?"
- **outputs**: urgency
- **next**: route-request

## route-request [>]

| condition | next |
| --- | --- |
| `urgency == "urgent"` | handle-urgent |
| `_otherwise` | handle-normal |

## handle-urgent [!]

Route urgent requests to immediate notification.

- **action_type**: intent
- **intent**: notify
- **params**: { "severity": "high", "message": "Urgent request received, routing to immediate attention" }
- **terminal**: true

## handle-normal [!]

Route normal requests to standard processing.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "Request queued for standard processing" }
- **terminal**: true
