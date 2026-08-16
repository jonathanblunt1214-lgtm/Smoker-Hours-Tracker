import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

export const AI_BRANCH_PATTERN = /^(agent|codex|gemini)\/[a-z0-9][a-z0-9._/-]*$/;

export function validatePullRequestBranch({ actor, base, head }) {
  assert.equal(base, 'main', 'AI pull requests must target main');
  assert.notEqual(head, 'main', 'automation must never make a pull request from main');
  if (actor === 'dependabot[bot]') {
    assert.match(head, /^dependabot\//, 'Dependabot must use its reserved branch prefix');
    return;
  }
  assert.match(
    head,
    AI_BRANCH_PATTERN,
    'AI branches must use agent/*, codex/*, or gemini/* (Codex may not use gemini/*)',
  );
}

function workflowSources() {
  return readdirSync(new URL('../.github/workflows/', import.meta.url))
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => [name, readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8')]);
}

test('valid AI branch prefixes are accepted', () => {
  for (const head of ['agent/task', 'codex/task-42', 'gemini/task_name']) {
    assert.doesNotThrow(() => validatePullRequestBranch({ actor: 'owner', base: 'main', head }));
  }
  assert.doesNotThrow(() => validatePullRequestBranch({
    actor: 'dependabot[bot]', base: 'main', head: 'dependabot/npm_and_yarn/typescript-5.8.3',
  }));
});

test('main and invalid AI branch prefixes are rejected', () => {
  for (const head of ['main', 'ai/task', 'chatgpt/task', 'feature/task', 'gemini']) {
    assert.throws(() => validatePullRequestBranch({ actor: 'owner', base: 'main', head }));
  }
  assert.throws(() => validatePullRequestBranch({ actor: 'owner', base: 'release', head: 'codex/task' }));
  assert.throws(() => validatePullRequestBranch({
    actor: 'owner', base: 'main', head: 'dependabot/npm_and_yarn/typescript-5.8.3',
  }));
});

test('workflow automation cannot push commits or refs directly to main', () => {
  const forbidden = [
    /git\s+push[^\n]*\bmain\b/i,
    /gh\s+api[^\n]*(?:git\/refs|refs\/heads\/main)/i,
    /github\.rest\.git\.(?:createRef|updateRef)/,
  ];

  for (const [name, source] of workflowSources()) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${name} contains direct-main write automation`);
    }
  }
});

if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
  validatePullRequestBranch({
    actor: process.env.PR_AUTHOR,
    base: process.env.PR_BASE_BRANCH,
    head: process.env.PR_HEAD_BRANCH,
  });
}
