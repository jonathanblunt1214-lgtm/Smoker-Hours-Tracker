import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const dashboardPath = new URL('../src/components/MasterAdminDashboardModal.tsx', import.meta.url);
const healthPath = new URL('../server/adminRoles.ts', import.meta.url);
const workflowDirectory = new URL('../.github/workflows/', import.meta.url);

test('Operations dashboard exposes no fake live-code editor', async () => {
  const source = await readFile(dashboardPath, 'utf8');
  assert.doesNotMatch(source, /Developer Tools|Generate draft only|Describe a code change to draft/i);
});

test('constitutional safeguards are presented as healthy protections', async () => {
  const source = await readFile(dashboardPath, 'utf8');
  for (const status of ['published_only', 'approval_required', 'client_managed', 'contract_enforced']) {
    assert.match(source, new RegExp(`['"]${status}['"]`));
  }
  assert.match(source, /Protected: unrestricted global production-data mutation is disabled by design/);
});

test('health covers every harvested database and immutable release metadata', async () => {
  const source = await readFile(healthPath, 'utf8');
  for (const kind of ['smoker', 'pellet', 'fuel', 'meat', 'temperature', 'mod', 'recipe', 'retailer_price']) {
    assert.match(source, new RegExp(`id: ['"]${kind}['"]`));
  }
  assert.match(source, /databaseKind \|\| data\?\.type/);
  assert.match(source, /evaluation: 'contract_enforced'/);
});

test('GitHub workflows use Node 24 action runtimes and deploy release identity', async () => {
  const names = (await readdir(workflowDirectory)).filter((name) => /\.ya?ml$/.test(name));
  for (const name of names) {
    const source = await readFile(new URL(name, workflowDirectory), 'utf8');
    assert.doesNotMatch(source, /actions\/(?:checkout|setup-node)@v4/, `${name} still uses a Node 20 action runtime`);
  }
  const deploy = await readFile(new URL('deploy-cloud-run.yml', workflowDirectory), 'utf8');
  assert.match(deploy, /APP_VERSION=\$\{\{ steps\.release_metadata\.outputs\.app_version \}\}/);
  assert.match(deploy, /GIT_COMMIT_SHA=\$\{\{ github\.sha \}\}/);
});
