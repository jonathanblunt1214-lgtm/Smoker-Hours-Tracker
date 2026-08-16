# SmokeStack Gemini Development Rules

## Governing authority

The **SmokeStack Engineering Constitution**, including every document in
`docs/constitution/`, is the hard ruling authority for all Gemini work in this
repository. It overrides convenience, speed, automation, generated output, and
all other repository guidance. If an instruction conflicts with the
constitution, stop and report the conflict. Do not work around it.

## Mandatory development protocol

1. Never commit or push directly to `main`, and never merge your own pull
   request.
2. Before editing, fetch `origin`, inspect open pull requests for changes to the
   same files, and stop and report a conflict when another open pull request
   overlaps the task.
3. Create a new `gemini/*` branch from the latest `origin/main` for every task.
   Never use a Codex branch, another agent's branch, or an existing task branch.
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
GitHub workflows or other automation, the constitution, or CharGPT policy
require explicit OWNER approval. Gemini may prepare such a change on its task
branch and open a pull request, but must clearly mark it as OWNER approval
required and must not approve, auto-merge, or merge it.
