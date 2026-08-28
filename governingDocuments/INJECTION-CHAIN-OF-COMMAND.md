# Injection Chain of Command

This document is part of the injected native governing body.

## Unified governing body

Injected governance does not sit beneath pre-existing project governance merely because it arrived later. Once assimilated, the injected governing documents join the receiving project's native governing body at the same governance level specified by the injection. `AI-HANDOFF` is the shared coordination state of that governing body. `AI-CONFLICTS` is the internal conflict ledger of that same governing body. They are not separate competing authorities.

Where two native governing rules genuinely conflict, agents must preserve the conflict, record it, continue only non-conflicting work, and route the unresolved decision to the OWNER or other explicitly designated native deciding authority. Agents must not invent a hierarchy to avoid the conflict.

## Development-first invariant

Every repository mutation, generated change, policy update, source edit, configuration change, workflow change, security change, documentation change, dependency change, migration, artifact definition, or other tracked modification MUST enter through the repository's designated development integration branch before it can reach production.

For Smoke Stack, the required chain is:

`task branch -> SmokeStack-development -> required security/CI/governance gates -> OWNER-reviewed promotion -> main`

No normal task branch may target `main` directly. No agent may treat urgency, simplicity, generated output, documentation-only status, governance-only status, security work, automation, owner convenience, or prior practice as an exception.

A production promotion is valid only when the head of the promotion is the designated development branch and all required gates have passed.

## Security and verification gates

All changes must pass the receiving project's required security, CI, governance, integrity, and review gates before promotion. The existence of a gate is part of the chain of command, not optional advice.

Agents must not bypass, suppress, disable, weaken, relabel, or route around required checks to obtain a green state. If a required security check needs a credential or repository setting the normal `GITHUB_TOKEN` cannot provide, the requirement remains active; agents must report the missing prerequisite rather than bypass the check.

## OWNER execution directive

When the OWNER gives a clear instruction that is lawful, technically possible, within the current authorized scope, and not in genuine conflict with higher-priority platform safety or repository constraints, agents execute it directly.

Agents must not create unnecessary procedural runaround, repeated confirmation, invented ambiguity, or discretionary reinterpretation. Clarification is reserved for real ambiguity, actual impossibility, safety/prohibition, or a genuine unresolved governance conflict.

The phrase `jump` therefore means the agent determines the required implementation details and executes within governing constraints rather than debating whether to comply.

## Multi-agent cooperation

All authorized agents work from shared project state. Each agent must preserve valid concurrent work, consume the latest handoff state before mutation, reconcile compatible changes, and record genuine incompatible changes in `AI-CONFLICTS`.

No agent may force-push, silently overwrite, erase, or disguise another authorized agent's valid work in order to simplify its own path.

## No-exception interpretation

The development-first chain applies to every tracked change produced through the repository workflow. There is no category-based exception for code, docs, configuration, governance, security, CI, generated files, or metadata.

Only a fresh, explicit OWNER directive that itself complies with higher-priority platform and safety requirements may change the chain. Agents must not infer exceptions.
