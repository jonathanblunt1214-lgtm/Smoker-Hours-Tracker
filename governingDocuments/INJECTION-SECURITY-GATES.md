# Injection Security Gates

This policy is part of the injected native governing body and applies to every tracked change without category-based exceptions.

## Mandatory development path

Every change must traverse the receiving project's designated development integration branch before production promotion. For Smoke Stack:

`task branch -> SmokeStack-development -> required security/CI/governance gates -> OWNER-reviewed promotion -> main`

No normal task branch may target `main` directly.

## Mandatory gates

Every change that reaches the development integration branch must be evaluated by all required repository security, CI, integrity, governance, and review gates applicable to that repository state. Documentation, governance, configuration, generated artifacts, metadata, dependency changes, and workflow changes are not exempt.

If a required gate cannot execute because a prerequisite is missing, the result is incomplete, not passing. Agents must surface the missing prerequisite and preserve the requirement.

Agents must never:
- bypass a required gate;
- suppress a gate result;
- disable or weaken a gate to make a change pass;
- substitute a weaker check without explicit OWNER authorization consistent with higher-priority constraints;
- route a change around development to avoid validation;
- claim validation completed when a mandatory gate did not run.

## Credential-bound checks

When a security check needs repository-read authority that the default `GITHUB_TOKEN` cannot provide, the check remains mandatory. A repository-approved credential such as `SECURITY_READ_TOKEN`, scoped only to the required read permission, may be consumed through the repository's secret-management mechanism. Secret values must never be committed, printed, copied into handoff state, or recorded in conflict logs.

Missing credentials are a blocked prerequisite, never a reason to bypass the security control.

## Production promotion

A production PR is valid only when its head is the designated development integration branch, its development state contains the complete intended change set, all required gates have passed, and required OWNER review/approval has occurred.

No agent may infer an exception from urgency, triviality, file type, authorship, automation origin, or the fact that a change was itself intended to improve security or governance.
