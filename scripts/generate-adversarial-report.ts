import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

type AssertionResult = {
  fullName?: string | string[];
  title?: string;
  status?: string;
  duration?: number;
  failureMessages?: string[];
};

type VitestFileResult = {
  name?: string;
  assertionResults?: AssertionResult[];
};

type VitestReport = {
  success?: boolean;
  startTime?: number;
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  testResults?: VitestFileResult[];
};

const root = resolve(import.meta.dirname, '..');
const outputDirectory = resolve(root, 'reports', 'adversarial_battery');
const jsonPath = resolve(outputDirectory, 'latest.json');
const markdownPath = resolve(outputDirectory, 'LATEST.md');

mkdirSync(outputDirectory, { recursive: true });

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = spawnSync(command, ['vitest', 'run', 'test/adversarial-battery.test.ts', '--reporter=json', `--outputFile=${jsonPath}`], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (run.error) {
  const message = run.error.message;
  writeFileSync(markdownPath, `# PRAETOR-MCP Adversarial Battery Report\n\nThe test runner could not start.\n\n- Error: ${message}\n`, 'utf8');
  console.error(`Unable to start adversarial test runner: ${message}`);
  process.exit(1);
}

let report: VitestReport = {};
try {
  report = JSON.parse(readFileSync(jsonPath, 'utf8')) as VitestReport;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeFileSync(markdownPath, `# PRAETOR-MCP Adversarial Battery Report\n\nThe test runner did not produce a readable Vitest report.\n\n- Error: ${message}\n`, 'utf8');
  process.exit(run.status ?? 1);
}

const assertions = (report.testResults ?? []).flatMap(file => file.assertionResults ?? []);
const statusIcon = (status: string | undefined): string => status === 'passed' ? 'PASS' : status === 'pending' ? 'PENDING' : 'FAIL';
const rows = assertions.map(assertion => {
  const name = Array.isArray(assertion.fullName)
    ? assertion.fullName.join(' > ')
    : assertion.fullName ?? assertion.title ?? 'Unnamed assertion';
  const duration = typeof assertion.duration === 'number' ? `${assertion.duration} ms` : '-';
  return `| ${statusIcon(assertion.status)} | ${name.replaceAll('|', '\\|')} | ${duration} |`;
});
const generatedAt = new Date().toISOString();
const success = report.success === true && (run.status ?? 1) === 0;
const markdown = [
  '# PRAETOR-MCP Adversarial Battery Report',
  '',
  `Generated: ${generatedAt}`,
  '',
  `Status: **${success ? 'PASS' : 'FAIL'}**`,
  '',
  '## Summary',
  '',
  `- Total assertions: ${report.numTotalTests ?? assertions.length}`,
  `- Passed: ${report.numPassedTests ?? assertions.filter(assertion => assertion.status === 'passed').length}`,
  `- Failed: ${report.numFailedTests ?? assertions.filter(assertion => assertion.status === 'failed').length}`,
  `- Pending: ${report.numPendingTests ?? assertions.filter(assertion => assertion.status === 'pending').length}`,
  '- Registry: `tests/PRAETOR_MCP_ADVERSARIAL_BATTERY.md`',
  '- Executable runner: `test/adversarial-battery.test.ts`',
  '',
  '## Case Results',
  '',
  '| Result | Assertion | Duration |',
  '|---|---|---:|',
  ...rows,
  '',
  success
    ? 'A passing battery is required before demo or promotion.'
    : 'The battery is failing; demo or promotion is blocked until the failure is investigated.',
  ''
].join('\n');

writeFileSync(markdownPath, markdown, 'utf8');
console.log(`Adversarial report written to ${markdownPath}`);
process.exit(run.status ?? (success ? 0 : 1));
