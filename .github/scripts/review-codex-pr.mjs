import { execFileSync } from 'node:child_process';

const marker = '<!-- smokestack-owner-review-required -->';
const prNumber = process.env.PR_NUMBER;
const repository = process.env.GH_REPO;
const DEVELOPMENT_BRANCH = 'SmokeStack-development';

if (!prNumber || !repository) throw new Error('PR_NUMBER and GH_REPO are required');

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

function api(path, jq) {
  const args = ['api', path];
  if (jq) args.push('--jq', jq);
  return gh(args);
}

function isSensitive(path) {
  const lower = path.toLowerCase();
  return (
    lower.startsWith('.github/') ||
    lower === 'firestore.rules' ||
    lower === 'firestore.indexes.json' ||
    lower === 'firebase.json' ||
    lower === 'dockerfile' ||
    lower.includes('constitution') ||
    /(auth|authentication|authorization|security|owner|admin)/i.test(path) ||
    /(deploy|deployment|cloud[-_]?run|cloudrun|firebase)/i.test(path) ||
    /(^|\/)(chargpt.*(policy|constitution)|.*chargpt.*policy.*)([./_-]|$)/i.test(path) ||
    /(^|\/)(google-services\.json|.*\.(jks|keystore|p12|pfx|pem|key|asc|gpg|sig))$/i.test(path) ||
    /(^|\/)(\.env($|\.)|.*\.env($|\.)|secrets?($|[./_-]))/i.test(path)
  );
}

function leaveOwnerNotice(files) {
  const existing = api(`repos/${repository}/issues/${prNumber}/comments`,
    `map(select(.body | contains("${marker}"))) | length`);
  if (Number(existing) > 0) return;
  const listed = files.slice(0, 20).map((file) => `- \`${file}\``).join('\n');
  const extra = files.length > 20 ? `\n- …and ${files.length - 20} more` : '';
  const body = `${marker}\n## Owner approval required\n\nThis pull request changes protected or sensitive files and **will not be auto-merged**. The repository owner must review and merge it manually after all required checks pass.\n\n${listed}${extra}`;
  gh(['api', `repos/${repository}/issues/${prNumber}/comments`, '-f', `body=${body}`]);
}

const pr = JSON.parse(api(`repos/${repository}/pulls/${prNumber}`));
if (pr.state !== 'open' || pr.draft || pr.base.ref !== DEVELOPMENT_BRANCH) process.exit(0);

// Routine automation may integrate only into SmokeStack-development. Promotion
// to main is never auto-merged and must come from SmokeStack-development under
// the repository's promotion review and branch-protection rules.
if (pr.head.repo?.full_name !== repository || !/^(codex|agent)\//.test(pr.head.ref)) process.exit(0);

const files = gh(['api', '--paginate', `repos/${repository}/pulls/${prNumber}/files`, '--jq', '.[].filename'])
  .split('\n').filter(Boolean);
const sensitive = files.filter(isSensitive);
if (sensitive.length > 0) {
  leaveOwnerNotice(sensitive);
  process.exit(0);
}

if (pr.mergeable === false || pr.mergeable_state === 'dirty') process.exit(0);

// Branch protection remains authoritative. If required checks are absent,
// pending, skipped unexpectedly, or failing, do not enable auto-merge.
let checks;
try {
  checks = JSON.parse(gh(['pr', 'checks', prNumber, '--repo', repository, '--required', '--json', 'name,state']));
} catch {
  process.exit(0);
}
if (checks.length === 0 || checks.some(({ state }) => state !== 'SUCCESS')) process.exit(0);

gh(['pr', 'merge', prNumber, '--repo', repository, '--auto', '--squash']);
