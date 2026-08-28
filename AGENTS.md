# SmokeStack Codex Development Rules

## Governing authority

The **SmokeStack Engineering Constitution**, including every document in
`docs/constitution/`, and the assimilated injected governance in root
`AI-HANDOFF.json` and `AI-CONFLICTS.json` are co-equal native repository
authorities. The injected files are not subordinate to the Constitution, and the
Constitution is not automatically controlling over them merely because it
pre-dates the injection.

Authorized agents must apply these co-equal native authorities together. They
must consume relevant shared handoff state, preserve valid concurrent work,
reconcile compatible changes, record genuine conflicts, and never silently
overwrite or force-push another agent's valid work. If co-equal native
authorities genuinely conflict and cannot be reconciled, preserve both sides,
record the conflict in `AI-CONFLICTS.json`, continue only safe non-conflicting
work, and route the unresolved decision to the native OWNER/project authority.
Do not invent a hierarchy between co-equal native governance files.

The original injected copies in `governingDocuments/` are retained as the
provenance and audit record. In particular,
`governingDocuments/ASSIMILATION.md` records the one-time injection authority;
it is not standing permission for future injections or direct mutation of
`main`.

## OWNER execution directive

When the OWNER gives a clear, lawful, technically possible instruction, agents
MUST execute it directly and efficiently. Do not add unnecessary debate,
detours, reinterpretation, repeated confirmation, or procedural runaround.
Treat a clear OWNER instruction as the requested action, not as an invitation to
substitute a different plan.

Ask for clarification or stop only when one of the following is actually true:
- the instruction is materially ambiguous and execution would require guessing;
- the requested action is unsafe, unlawful, or prohibited by higher-priority
  platform authority;
- the requested action is technically impossible with the available tools or
  permissions;
- a genuine conflict among co-equal native repository authorities cannot be
  reconciled without OWNER resolution.

When a required repository process applies, follow it while still carrying out
the OWNER's underlying instruction. Process is a chain of command, not a reason
to avoid execution.

## Mandatory branch chain

`main` is the protected production branch. `SmokeStack-development` is the
mandatory integration branch. There are no task-level exceptions to this chain:

`task branch -> SmokeStack-development -> validated OWNER-reviewed promotion -> main`

1. Never commit or push directly to `main` or `SmokeStack-development`, and never
   merge your own pull request.
2. Before editing, fetch `origin`, inspect open pull requests for changes to the
   same files, and stop and report a conflict when another open pull request
   overlaps the task.
3. Create a new `agent/*`, `codex/*`, or other repository-approved task branch
   from the latest `origin/SmokeStack-development` for every task. Never reuse
   another agent's branch or an existing task branch.
4. Every normal task pull request MUST target `SmokeStack-development`. A task
   branch MUST NOT target `main`, even for documentation, governance, security,
   workflow, emergency, dependency, or OWNER-controlled changes.
5. A pull request targeting `main` is a promotion pull request and MUST have
   `SmokeStack-development` as its exact head branch. No other head branch is
   permitted to promote to `main`.
6. Keep credentials, API keys, tokens, private keys, service-account material,
   and other secrets out of the repository and generated artifacts.
7. Treat generated files as derived artifacts only. Regenerate them exclusively
   with the repository's trusted build scripts; never hand-edit them or allow
   them to become a competing source of truth.
8. Before requesting review into `SmokeStack-development`, run lint, all tests
   relevant to the change, the CharGPT contract tests, the production build,
   and all required security/trust gates. Report every result.
9. Before promotion from `SmokeStack-development` to `main`, rerun all required
   repository checks against the promotion PR. Promotion may proceed only after
   required checks pass and required OWNER approval is present.
10. Never bypass required checks, branch protection, review, OWNER approval, or
    the `SmokeStack-development` integration stage.

## OWNER-controlled changes

Changes involving Firebase, authentication or authorization, deployment,
GitHub workflows or other automation, the constitution, repository governance,
or CharGPT policy require explicit OWNER approval. Codex may prepare such a
change on its task branch and open a pull request to `SmokeStack-development`,
but must clearly mark it as OWNER approval required and must not approve,
auto-merge, or merge it. OWNER-controlled changes are still subject to the same
mandatory branch chain and may reach `main` only through a subsequent promotion
pull request whose head is exactly `SmokeStack-development`.
