# JiraPilot AI

JiraPilot AI connects Jira acceptance criteria with generated Playwright tests and a local dashboard for reviewing test plans, execution results, and repair proposals. The repository includes an isolated EventHub mock so the generated booking scenarios can be exercised without visiting the real EventHub website or creating real bookings.

## Features

- Organizes Jira acceptance criteria into a test plan and generated Playwright scenarios.
- Runs the APJTPAA-1 generated scenarios against a local-only EventHub mock.
- Writes structured execution results and an HTML Playwright report.
- Provides failure analysis and a narrowly constrained, human-approved repair workflow.
- Provides a local Express dashboard for viewing generated scenarios, execution results, and PR proposals.
- Keeps the live EventHub test configuration separate from local mock execution.

## Requirements

- Node.js and npm
- Dependencies installed from the repository's lockfile
- VS Code Copilot Agent and configured Atlassian/GitHub MCP integrations for workflows that need Jira or repository data

The local mock test workflow does not require Jira credentials or real EventHub credentials.

## Install

From the repository root:

```bash
npm ci
```

## Run the local mock tests

Run the APJTPAA-1 generated Playwright tests against the local mock:

```bash
npm run test:apjtpaa-1
```

The runner starts Playwright with `playwright.config.js`. That configuration starts the mock server at `http://127.0.0.1:4173`, uses one worker, and runs `tests/generated/APJTPAA-1.spec.js`. The mock accepts only loopback requests, and the generated tests block requests outside the mock origin.

The mock uses dummy credentials only:

```text
Email:    qa@example.test
Password: LocalMockOnly-123!
```

These are for the isolated local mock and are not real EventHub credentials.

To explicitly run using the mock-specific script:

```bash
npm run test:apjtpaa-1:mock
```

The command configured to enable the controlled mock failure is:

```bash
npm run test:apjtpaa-1:mock:failure
```

Use the failure-injection command only when deliberately demonstrating failure handling. It changes mock event wording; whether it produces a failure depends on the current generated test parser. No repair is applied automatically.

## Results and HTML report

Structured result JSON files and related analysis artifacts are written under:

```text
generated/results/
```

The local mock HTML report is written under:

```text
playwright-report/APJTPAA-1/
```

Open the report's `index.html` in a browser after a run. Playwright test output is written under `test-results/APJTPAA-1/`.

## Dashboard

Start the local dashboard:

```bash
npm start
```

By default, open [http://localhost:3000](http://localhost:3000). Set the `PORT` environment variable to use a different port. Dashboard AI proposal features may use Gemini when configured; do not put credentials in source code or commit environment files.

## Failure analysis and repair safeguards

The failure-analysis CLI supports:

```bash
node src/execution/failure-analysis.js analyze generated/results/<result-file>.json
node src/execution/failure-analysis.js propose generated/results/<result-file>.json
node src/execution/failure-analysis.js apply generated/results/<result-file>.json --human-approved
```

Failure analysis and repair proposals require an execution status of `failed` and at least one test with status `failed`. Timed-out, interrupted, and not-run tests are not eligible for repair.

Repair proposals are restricted to `local_mock`. Review the proposal before applying it. Application requires an interactive terminal and confirmation of the exact proposal SHA-256 hash. The validator permits only the approved `still open` alternative to be appended to the existing seat-count regex; any other source change is rejected. A shared exclusive lock prevents concurrent repairs to the generated test file. The workflow retains a backup and enforces one repair attempt per run.

When Gemini analysis is enabled, failure details and generated test source may be sent to Gemini. Set `JIRAPILOT_DISABLE_GEMINI_ANALYSIS=true` to keep failure analysis on the deterministic local fallback. Provider error details are omitted from workflow output.

If a process exits unexpectedly while holding the repair lock, it may leave a lock file beside the generated test. Review that no repair is running and inspect the situation before removing a stale lock.

## Jira and GitHub integrations

Jira retrieval and GitHub repository operations are performed by the configured VS Code Copilot Agent integrations, not by assuming the Express server can access MCP tools. Jira access should remain read-only. Review proposed repository changes and obtain explicit approval before publishing a branch or pull request. Never publish or merge automatically.

## Live EventHub tests

The separate live test target uses `playwright.live.config.js` and is not part of the local mock command. Live booking tests can affect real data. Do not run them without explicit approval for that specific run; prefer the local mock.

## Project layout

```text
.github/agents/                 Copilot workflow profiles
generated/                      Acceptance-criteria plan and workflow artifacts
public/                         Dashboard frontend
src/execution/                  Test runner, JSON reporter, and failure analysis
tests/generated/                Jira-generated Playwright tests
tests/mock-eventhub/            Loopback-only local EventHub mock
tests/                           Other Playwright tests and approval setup
playwright.config.js             Local mock Playwright configuration
playwright.live.config.js        Separate live-test configuration
server.js                        Express dashboard server
```
