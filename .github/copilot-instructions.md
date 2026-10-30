# JiraPilot AI Workspace Instructions

## Agent and integration boundaries

- Use the VS Code Copilot Agent as the workflow orchestrator. It retrieves Jira data through the configured Atlassian MCP tools and inspects or prepares repository changes through the configured GitHub MCP tools.
- Do not assume the Express server can access VS Code MCP tools. MCP calls belong to the Copilot Agent; keep the server as the existing application/UI and local execution surface unless a separately approved design changes it.
- Use Gemini for structured acceptance-criteria planning or Playwright test generation when the configured integration is available. Treat model output as untrusted: validate it against Jira, the approved plan, project conventions, and safety rules before use.
- Use Atlassian MCP read-only for Jira retrieval. Never transition an issue or otherwise mutate Jira.
- Use GitHub MCP only for repository operations that are needed. Inspect existing branches and open PRs for the Jira issue before proposing publication; do not create a duplicate.

## Jira-to-Playwright workflow

1. Retrieve the requested Jira issue and identify its summary, description, status, and acceptance criteria. Preserve the issue key and distinguish Jira facts from user-supplied additions.
2. Extract each acceptance criterion into a traceable plan. Map every in-scope criterion to one or more concrete executable Playwright tests and expected assertions. Call out ambiguity, missing coverage, and unavailable fixtures instead of inventing facts.
3. Generate JavaScript tests using the repository's CommonJS conventions (`require`, `module.exports`) and existing Playwright Test conventions. Prefer existing helpers and patterns; do not rebuild the Express application.
4. Validate the generated code and plan before execution. A scenario is not implemented coverage unless it has meaningful browser actions and assertions tied to its expected result.
5. Execute only approved tests in the specified environment, collect structured outcomes and failure evidence, diagnose failures, and produce an HTML report with criterion coverage.
6. On failure, analyze captured results using Gemini when configured and a deterministic fallback otherwise. A repair proposal is never applied automatically: review the generated-test-only proposal with the user and obtain explicit approval before making at most one repair application attempt per workflow run. Preserve a backup, revalidate, and rerun only the affected approved test. Report unresolved failures honestly.
7. Review existing GitHub PRs and branches for duplicates before preparing any publication. Present the proposed diff, test/report results, and destination to the user for explicit approval before GitHub publication.

## Test quality and safe execution

- Never add `test.skip()` placeholders to disguise missing test logic or failing behavior. If a scenario cannot safely or credibly be implemented, report it as blocked and explain what fixture or information is needed.
- Never weaken, delete, bypass, or make assertions conditional merely to get a passing result. Do not change product behavior to mask a test failure unless separately requested and approved.
- Diagnose failures from actual Playwright output and artifacts. Distinguish application defects, test defects, and environment/data problems; do not claim a test passed unless it actually passed.
- APJTPAA-1 generated tests run only against the loopback mock through `npm run test:apjtpaa-1`. The mock binds to `127.0.0.1`, uses dummy credentials, and the tests abort and fail on any browser request outside `127.0.0.1:4173`. Mock runs disable Gemini network analysis.
- `npm run test:apjtpaa-1:mock:failure` deliberately changes only the local mock seat-count wording to exercise failure analysis and a deterministic repair proposal. Proposals remain pending human approval and are never applied automatically.
- The original live booking test is isolated in `playwright.live.config.js` and requires `JIRAPILOT_ALLOW_EVENTHUB_LIVE_TESTS=true`. It creates a booking; local mock approval never authorizes that live test.
- Never run the live EventHub booking test or any test that can create a booking or otherwise mutate live data without the user's explicit approval for that run. Prefer an isolated local/staging environment with controlled, resettable data.
- Before running tests, state the target environment and whether the test is read-only or state-changing. Require explicit user approval for live or state-changing tests.
- Do not automatically create, publish, or merge a pull request. Never merge automatically. Require explicit user approval before creating remote branches/commits or publishing a PR, and leave Jira unchanged.
- Keep credentials, tokens, private issue data, and personal data out of generated code, logs, reports, diffs, and chat responses.

## Protecting workspace changes

- Before editing, inspect `git status` and relevant diffs. The existing uncommitted changes in `server.js` and `public/index.html` are user work: preserve and integrate them.
- Do not overwrite, discard, reset, stash, or silently replace existing user changes. If a requested change conflicts with them, stop and explain the conflict before proceeding.
- Keep changes limited to the approved scope. Do not commit or push unless explicitly requested.

## Secrets

- Never read, print, search, quote, copy, or expose `.env` contents or secret values. Do not include secrets in terminal commands, tool arguments, generated tests, HTML reports, or logs.
- Refer to environment variable names only when needed; validate that required configuration exists without displaying its value.
