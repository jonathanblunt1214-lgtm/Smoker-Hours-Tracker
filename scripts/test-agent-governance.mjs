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

function pullRequestContext() {
  let actor = process.env.PR_AUTHOR;
  let base = process.env.PR_BASE_BRANCH;
  let head = process.env.PR_HEAD_BRANCH;

  if ((!actor || !base || !head) && process.env.GITHUB_EVENT_PATH) {
    try {
      const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      actor ||= event.pull_request?.user?.login || event.sender?.login;
      base ||= event.pull_request?.base?.ref;
      head ||= event.pull_request?.head?.ref;
    } catch {
      // Fail closed below if required pull-request metadata cannot be resolved.
    }
  }

  return { actor, base, head };
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
  validatePullRequestBranch(pullRequestContext());
}
