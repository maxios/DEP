---
dap:
  id: deploy-to-prod
  version: 1
  trigger: "deploy application to production environment"
  trigger_patterns:
    - "deploy * to production"
    - "release * to prod"
    - intent: deploy_production
  audience: [ai-agent]
  owner: "@platform-team"
  created: 2026-04-25T12:00:00+02:00
  last_verified: 2026-04-25T12:00:00+02:00
  confidence: medium
  depends_on:
    - dap://rollback-procedure.md
  tags: [deployment, production, ci-cd]
  entry_node: check-environment
---

# Deploy to Production

Route a production deployment through safety checks, migrations, deployment, and verification.

## check-environment [?]

Determine the target environment status before deploying.

- **method**: tool_call
- **tool**: get_environment_status
- **args**: { "env": "production" }
- **outputs**: env_status, current_version, pending_migrations
- **next**: decide-deployment-path

## decide-deployment-path [>]

Route based on environment status and migration state.

| condition | next |
| --- | --- |
| `env_status == "healthy" AND pending_migrations == 0` | execute-deploy |
| `env_status == "healthy" AND pending_migrations > 0` | run-migrations-first |
| `env_status == "degraded"` | alert-oncall |
| `_otherwise` | escalate-to-human |

## run-migrations-first [!]

Execute pending database migrations before deploying.

- **action_type**: document
- **ref**: dep://docs/how-to/run-database-migrations.md
- **summary**: Run all pending database migrations, verify they complete successfully, then proceed to deployment.
- **on_success**: execute-deploy
- **on_failure**: escalate-to-human

## execute-deploy [!]

Deploy the application to production.

- **action_type**: tool_call
- **tool**: deploy_application
- **args**: { "env": "production", "version": "{{ requested_version }}" }
- **on_success**: verify-deployment
- **on_failure**: trigger-rollback

## verify-deployment [?]

Check that the deployment succeeded via health check.

- **method**: tool_call
- **tool**: health_check
- **args**: { "env": "production", "timeout": 120 }
- **outputs**: health_status
- **next**: decide-verification

## decide-verification [>]

| condition | next |
| --- | --- |
| `health_status == "healthy"` | deployment-complete |
| `_otherwise` | trigger-rollback |

## deployment-complete [!]

Deployment succeeded.

- **action_type**: intent
- **intent**: report_success
- **params**: { "message": "Deployed {{ requested_version }} to production successfully" }
- **terminal**: true

## trigger-rollback [@]

Delegate to the rollback procedure.

- **delegate_to**: dap://rollback-procedure.md
- **pass_context**: { "env": "production", "failed_version": "{{ requested_version }}" }
- **terminal**: true

## alert-oncall [!]

Environment is degraded. Alert on-call and block deployment.

- **action_type**: intent
- **intent**: notify
- **params**: { "severity": "warning", "message": "Production environment degraded, deployment blocked" }
- **terminal**: true

## escalate-to-human [!]

Cannot proceed automatically. Escalate.

- **action_type**: intent
- **intent**: escalate
- **params**: { "reason": "Automated deployment blocked due to unexpected state" }
- **terminal**: true
