import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const PRODUCT_ROOTS = ['src', 'public', 'android'];
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.xml', '.gradle', '.kts', '.properties']);

function extension(path) {
  const index = path.lastIndexOf('.');
  return index === -1 ? '' : path.slice(index);
}

function collectFiles(root) {
  if (!existsSync(root)) return [];
  const output = [];
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) output.push(...collectFiles(fullPath));
    else if (TEXT_EXTENSIONS.has(extension(fullPath))) output.push(fullPath);
  }
  return output;
}

function scan(pattern) {
  const hits = [];
  for (const root of PRODUCT_ROOTS) {
    for (const file of collectFiles(root)) {
      const source = readFileSync(file, 'utf8');
      if (pattern.test(source)) hits.push(relative(process.cwd(), file));
    }
  }
  return hits;
}

test('Smoke Stack product runtime contains no assimilation behavior or terminology', () => {
  const hits = scan(/assimil(?:ate|ated|ates|ating|ation)/i);
  assert.deepEqual(
    hits,
    [],
    `Assimilation is not a Smoke Stack product capability. Remove it from runtime/mobile code: ${hits.join(', ')}`,
  );
});

test('Crucible remains an external validator and is not a Smoke Stack runtime dependency', () => {
  const hits = scan(/(?:The[- ]Crucible|\bCrucible\b)/i);
  assert.deepEqual(
    hits,
    [],
    `Crucible belongs to its own project and may only validate Smoke Stack externally through CI/configuration: ${hits.join(', ')}`,
  );
});
