import { runRegisteredHarvesters } from '../server/databaseHarvesters';

const result = await runRegisteredHarvesters('github-actions-scheduled-harvester');

console.log(JSON.stringify(result, null, 2));
console.log(`[database-harvesters] Sources: ${result.sourceCount}; candidates: ${result.candidateCount}; unchanged: ${result.unchangedCount}; failures: ${result.failureCount}.`);

if (result.failureCount > 0) {
  process.exitCode = 1;
}
