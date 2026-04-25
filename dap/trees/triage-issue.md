---
dap:
  id: triage-issue
  version: 1
  trigger: "user reports a problem with the application"
  trigger_patterns:
    - "user reports *"
    - "issue reported *"
    - intent: triage_issue
  audience: [ai-agent]
  owner: "@support-team"
  created: 2026-04-25T12:00:00+02:00
  last_verified: 2026-04-25T12:00:00+02:00
  confidence: medium
  depends_on:
    - dep://docs/reference/error-codes.md
  tags: [support, triage, issue]
  entry_node: gather-symptoms
---

# Triage User Issue

Route a user-reported issue to the correct resolution path based on symptoms.

## gather-symptoms [?]

Ask the user to describe the problem.

- **method**: prompt
- **prompt**: "What error are you seeing? Please include any error codes or messages."
- **outputs**: user_description, error_code
- **next**: classify-issue

## classify-issue [>]

Route based on the reported symptoms.

| condition | next |
| --- | --- |
| `error_code != "" AND error_code in known_errors` | lookup-known-fix |
| `user_description contains "slow"` | check-performance |
| `user_description contains "crash"` | collect-logs |
| `_otherwise` | escalate |

## lookup-known-fix [!]

Error code is recognized. Look up the documented fix.

- **action_type**: document
- **ref**: dep://docs/reference/error-codes.md
- **summary**: Find the matching error code in the reference and follow its documented resolution steps.
- **terminal**: true

## check-performance [?]

Gather performance metrics to diagnose slowness.

- **method**: tool_call
- **tool**: get_performance_metrics
- **args**: { "timeframe": "last_hour" }
- **outputs**: cpu_usage, memory_usage, response_time_p99
- **next**: decide-performance-action

## decide-performance-action [>]

| condition | next |
| --- | --- |
| `cpu_usage > 90` | report-high-cpu |
| `memory_usage > 90` | report-high-memory |
| `response_time_p99 > 5000` | report-slow-responses |
| `_otherwise` | escalate |

## report-high-cpu [!]

CPU usage is critically high.

- **action_type**: intent
- **intent**: notify
- **params**: { "severity": "critical", "message": "CPU usage at {{ cpu_usage }}%. Likely cause of user-reported slowness." }
- **terminal**: true

## report-high-memory [!]

Memory usage is critically high.

- **action_type**: intent
- **intent**: notify
- **params**: { "severity": "critical", "message": "Memory usage at {{ memory_usage }}%. Possible memory leak." }
- **terminal**: true

## report-slow-responses [!]

Response times are abnormally high.

- **action_type**: intent
- **intent**: notify
- **params**: { "severity": "warning", "message": "P99 response time at {{ response_time_p99 }}ms. Investigate API bottlenecks." }
- **terminal**: true

## collect-logs [?]

Application crash reported. Collect recent logs.

- **method**: tool_call
- **tool**: get_recent_logs
- **args**: { "level": "error", "limit": 50 }
- **outputs**: log_entries, crash_signature
- **next**: decide-crash-action

## decide-crash-action [>]

| condition | next |
| --- | --- |
| `crash_signature != ""` | report-crash |
| `_otherwise` | escalate |

## report-crash [!]

Crash signature identified.

- **action_type**: intent
- **intent**: notify
- **params**: { "severity": "critical", "message": "Crash detected: {{ crash_signature }}. Logs collected for analysis." }
- **terminal**: true

## escalate [!]

Cannot diagnose automatically. Escalate to human.

- **action_type**: intent
- **intent**: escalate
- **params**: { "reason": "Unable to classify issue from symptoms", "context": "{{ user_description }}" }
- **terminal**: true
