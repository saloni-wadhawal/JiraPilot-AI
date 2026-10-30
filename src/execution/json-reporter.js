const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const RESULTS_DIRECTORY = path.resolve(
  process.cwd(),
  'generated',
  'results'
);

function createDefaultResultsPath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(
    RESULTS_DIRECTORY,
    `APJTPAA-1-${timestamp}-${process.pid}.json`
  );
}

function resolveResultsPath() {
  const configuredPath = process.env.JIRAPILOT_RESULTS_FILE;
  const resultsPath = configuredPath
    ? path.resolve(configuredPath)
    : createDefaultResultsPath();
  const relativePath = path.relative(RESULTS_DIRECTORY, resultsPath);

  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    !/^APJTPAA-1-[A-Za-z0-9-]+\.json$/.test(path.basename(resultsPath))
  ) {
    throw new Error('Structured result path must be a JiraPilot APJTPAA-1 JSON file under generated/results.');
  }

  return resultsPath;
}

function sanitizeFailureMessage(message) {
  return String(message)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(Bearer|Basic)\s+\S+/gi, '$1 [REDACTED]')
    .replace(/\b(api[_-]?key|client[_-]?secret|access[_-]?token|password|token|secret|authorization)\b\s*[:=]\s*\S+/gi, '$1=[REDACTED]');
}

function summarizeTest(test, result) {
  const failures = (result.errors || [])
    .map(error => error.message)
    .filter(Boolean)
    .map(sanitizeFailureMessage);

  return {
    name: sanitizeFailureMessage(test.titlePath().join(' › ')),
    status: result.status,
    durationMs: result.duration,
    failureMessages: failures
  };
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

class JiraPilotJsonReporter {
  constructor() {
    this.startedAt = null;
    this.startedAtIso = null;
    this.sourceSha256 = null;
    this.tests = [];
    this.errors = [];
  }

  onBegin(config, suite) {
    this.startedAt = Date.now();
    this.startedAtIso = new Date(this.startedAt).toISOString();
    const testFilePath = path.resolve(
      process.cwd(),
      'tests',
      'generated',
      'APJTPAA-1.spec.js'
    );
    this.sourceSha256 = crypto
      .createHash('sha256')
      .update(fs.readFileSync(testFilePath))
      .digest('hex');
    this.tests = suite.allTests().map(test => ({
      id: test.id,
      name: sanitizeFailureMessage(test.titlePath().join(' › ')),
      status: 'not-run',
      durationMs: 0,
      failureMessages: []
    }));
  }

  onTestEnd(test, result) {
    const testResult = summarizeTest(test, result);
    const index = this.tests.findIndex(record => record.id === test.id);

    if (index !== -1) {
      this.tests[index] = {
        id: test.id,
        ...testResult
      };
    }
  }

  onError(error) {
    if (error && error.message) {
      this.errors.push(sanitizeFailureMessage(error.message));
    }
  }

  onEnd(result) {
    const finishedAt = Date.now();
    const total = this.tests.length;
    const passed = this.tests.filter(test => test.status === 'passed').length;
    const skipped = this.tests.filter(test => test.status === 'skipped').length;
    const failedTests = this.tests.filter(
      test => test.status !== 'passed' && test.status !== 'skipped'
    );

    for (const test of failedTests) {
      if (test.status === 'not-run') {
        test.failureMessages.push('The test did not complete.');
      }
    }

    const counts = {
      total,
      passed,
      failed: failedTests.length,
      skipped
    };

    const report = {
      schemaVersion: 1,
      issueKey: 'APJTPAA-1',
      testFile: 'tests/generated/APJTPAA-1.spec.js',
      sourceSha256: this.sourceSha256,
      execution: {
        status: result.status,
        environment: process.env.JIRAPILOT_TEST_ENVIRONMENT || 'unspecified',
        controlledFailureEnabled: process.env.JIRAPILOT_MOCK_FORCE_FAILURE === 'true',
        startedAt: this.startedAtIso,
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: this.startedAt === null ? 0 : finishedAt - this.startedAt
      },
      summary: counts,
      tests: this.tests,
      failureMessages: [
        ...this.errors,
        ...this.tests
          .filter(test => test.status !== 'passed' && test.status !== 'skipped')
          .flatMap(test => test.failureMessages.map(message => `${test.name}: ${message}`))
      ]
    };

    writeJsonAtomically(resolveResultsPath(), report);
  }
}

module.exports = JiraPilotJsonReporter;
