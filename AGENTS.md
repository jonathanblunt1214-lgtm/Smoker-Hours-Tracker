# SmokeStack Codex Development Rules

## Governing authority

The **SmokeStack Engineering Constitution**, including every document in
`docs/constitution/`, is the hard ruling authority for all Codex work in this
repository. It overrides convenience, speed, automation, generated output, and
all other repository guidance. If an instruction conflicts with the
constitution, stop and report the conflict. Do not work around it.

The injected cooperative-governance package is assimilated at the repository's
native governance level through the root `AI-HANDOFF.json` and
`AI-CONFLICTS.json` files. Authorized agents must consume relevant shared
handoff state, preserve valid concurrent work, reconcile compatible changes,
record genuine conflicts, and never silently overwrite or force-push another
agent's valid work. These files do not widen authority and remain subordinate to
the SmokeStack Engineering Constitution and other higher-priority native
controls.

The original injected copies in `governingDocuments/` are retained as the
provenance and audit record. In particular,
`governingDocuments/ASSIMILATION.md` records the one-time injection authority;
it is not standing permission for future injections or direct mutation of
`main`.

## Mandatory development protocol

1. Never commit or push directly to `main`, and never merge your own pull
   request.
2. Before editing, fetch `origin`, inspect open pull requests for changes to the
   same files, and stop and report a conflict when another open pull request
   overlaps the task.
3. Create a new `agent/*` or `codex/*` branch from the latest `origin/main` for
   every task. Never reuse another agent's branch or an existing task branch.
4. Keep credentials, API keys, tokens, private keys, service-account material,
   and other secrets out of the repository and generated artifacts.
5. Treat generated files as derived artifacts only. Regenerate them exclusively
   with the repository's trusted build scripts; never hand-edit them or allow
   them to become a competing source of truth.
6. Before requesting review, run lint, all tests relevant to the change, the
   CharGPT contract tests, and the production build. Report every result.
7. Push the task branch and open a pull request targeting `main`. Never bypass
   required checks, branch protection, review, or OWNER approval.

## OWNER-controlled changes

Changes involving Firebase, authentication or authorization, deployment,
GitHub workflows or other automation, the constitution, repository governance,
or CharGPT policy require explicit OWNER approval. Codex may prepare such a
change on its task branch and open a pull request, but must clearly mark it as
OWNER approval required and must not approve, auto-merge, or merge it.
