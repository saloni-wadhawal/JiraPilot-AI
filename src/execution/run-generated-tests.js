const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TEST_FILE = 'tests/generated/APJTPAA-1.spec.js';
const RESULTS_DIRECTORY = path.join(PROJECT_ROOT, 'generated', 'results');

function createResultsPath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(
    RESULTS_DIRECTORY,
    `APJTPAA-1-${timestamp}-${process.pid}.json`
  );
}

function writeJsonAtomically(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx'
  });
  fs.renameSync(temporaryPath, filePath);
}

function writeBlockedResult(filePath) {
  const timestamp = new Date().toISOString();
  writeJsonAtomically(filePath, {
    schemaVersion: 1,
    issueKey: 'APJTPAA-1',
    testFile: TEST_FILE,
    execution: {
      status: 'blocked',
      startedAt: timestamp,
      finishedAt: timestamp,
      durationMs: 0,
      exitCode: null
    },
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    },
    tests: [],
    failureMessages: [
      'Execution was blocked: explicit EventHub test-run approval was not provided. No tests were started.'
    ]
  });
}

function writeRunnerFailure(filePath) {
  const timestamp = new Date().toISOString();
  writeJsonAtomically(filePath, {
    schemaVersion: 1,
    issueKey: 'APJTPAA-1',
    testFile: TEST_FILE,
    execution: {
      status: 'runner_error',
      startedAt: timestamp,
      finishedAt: timestamp,
      durationMs: 0,
      exitCode: null
    },
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    },
    tests: [],
    failureMessages: [
      'The Playwright process could not start or did not produce a structured result.'
    ]
  });
}

function runGeneratedTests() {
  fs.mkdirSync(RESULTS_DIRECTORY, { recursive: true });
  const resultsPath = createResultsPath();
  const argsProvided = process.argv.slice(2);
  const mockMode = argsProvided.includes('--mock');
  const forceFailure = argsProvided.includes('--mock-failure');

  if (!mockMode) {
    writeBlockedResult(resultsPath);
    console.error(
      `Generated test execution blocked: use the explicit local mock mode. Result: ${path.relative(PROJECT_ROOT, resultsPath)}`
    );
    process.exitCode = 1;
    return;
  }

  const cliPath = require.resolve('@playwright/test/cli');
  const args = [
    cliPath,
    'test',
    TEST_FILE,
    '--config=playwright.config.js'
  ];
  const child = spawn(process.execPath, args, {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      JIRAPILOT_RESULTS_FILE: resultsPath,
      JIRAPILOT_TEST_ENVIRONMENT: 'local_mock',
      JIRAPILOT_MOCK_FORCE_FAILURE: forceFailure ? 'true' : 'false',
      JIRAPILOT_DISABLE_GEMINI_ANALYSIS: 'true'
    },
    stdio: 'ignore',
    windowsHide: true
  });

  registerChildProcessEvents(child, resultsPath);
}

async function finalizeExecution(code, resultsPath) {
  const exitCode = Number.isInteger(code) ? code : 1;
  if (!fs.existsSync(resultsPath)) {
    writeRunnerFailure(resultsPath);
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  } catch {
    console.error(
      `Structured results could not be read. Result: ${path.relative(PROJECT_ROOT, resultsPath)}`
    );
    process.exitCode = 1;
    return;
  }

  const { total, passed, failed, skipped } = report.summary;
  console.log(
    `APJTPAA-1: total=${total}, passed=${passed}, failed=${failed}, skipped=${skipped}. ` +
    `Results: ${path.relative(PROJECT_ROOT, resultsPath)}`
  );

  if (failed > 0) {
    try {
      const { analyzeFailedRun } = require('./failure-analysis');
      const analysisResult = await analyzeFailedRun(resultsPath);
      console.log(
        `Failure analysis: ${path.relative(PROJECT_ROOT, analysisResult.analysisPath)}`
      );
    } catch (error) {
      console.error(
        `Failure analysis could not be completed: ${error.message}`
          .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
          .replace(/\b(Bearer|Basic)\s+\S+/gi, '$1 [REDACTED]')
          .replace(/\b(api[_-]?key|client[_-]?secret|access[_-]?token|password|token|secret|authorization)\b\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
      );
      process.exitCode = 1;
      return;
    }
  }

  process.exitCode = exitCode;
}

function registerChildProcessEvents(child, resultsPath) {
  let completed = false;

  child.once('error', () => {
    if (completed) return;
    completed = true;
    writeRunnerFailure(resultsPath);
    console.error(
      `Playwright could not start. Result: ${path.relative(PROJECT_ROOT, resultsPath)}`
    );
    process.exitCode = 1;
  });

  child.once('close', code => {
    if (completed) return;
    completed = true;
    void finalizeExecution(code, resultsPath);
  });
}

runGeneratedTests();
