# Codex pull request automation

SmokeStack validates every pull request into `main` with a locked dependency install, lint/type check, the CharGPT contract suite when it exists, and a production build. The existing Phase 0 trust gate remains independent and required. A successful merge to `main` continues to trigger the existing Cloud Run and path-scoped Firebase deployment workflows.

## Automatic flow

Routine Codex changes are eligible only when they use a same-repository `codex/*` or `agent/*` branch. After both required workflows succeed, the trusted default-branch automation inspects the pull request through the GitHub API. It enables **squash auto-merge** only when GitHub reports every branch-protection-required check as successful and the pull request is conflict-free. GitHub branch protection remains the final authority; the automation never uses an administrator bypass or merges directly.

Failed, pending, draft, ineligible, or conflicted pull requests remain open. A later successful required-check completion re-evaluates the pull request.

## Owner exception flow

Sensitive changes never enter the automatic merge path. This includes GitHub workflows; authentication, authorization, owner/admin, and security code; Firestore rules and Firebase configuration; deployment and Cloud Run configuration; secrets, signing material, `google-services.json`, and environment files; and the app constitution or CharGPT policy. The automation leaves a single, clearly marked comment listing the sensitive paths. The owner must review the diff, wait for all required checks, and merge manually.

Workflow code always comes from `main`; pull-request code is never executed with the auto-merge workflow's write token. No credentials or repository secrets are used.

## One-time GitHub settings checklist

In **Settings → General → Pull Requests** and **Settings → Branches → branch protection for `main`**:

- [ ] Enable **Allow auto-merge**.
- [ ] Enable **Allow squash merging** (and keep squash available as an allowed merge method).
- [ ] Require a pull request before merging.
- [ ] Require status checks to pass before merging.
- [ ] Require branches to be up to date before merging.
- [ ] Add these exact required checks: **Install, lint, test, and build** and **trust-build**.
- [ ] Enable **Do not allow bypassing the above settings** (include administrators).
- [ ] Keep force pushes and branch deletion disabled for `main`.
- [ ] Under **Settings → Actions → General → Workflow permissions**, allow GitHub Actions to create and approve pull requests so the scoped workflow token can enable auto-merge and post the owner-review comment.

Do not reopen or reuse closed pull request #23; use a new branch and pull request for all automation changes.
