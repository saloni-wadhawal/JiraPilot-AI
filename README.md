# JiraPilot AI – AI-Powered Jira-to-Playwright Automation Agent
Transform Jira requirements into automated Playwright tests using AI.


## Overview

JiraPilot AI is an AI-assisted QA automation project that converts Jira requirements and acceptance criteria into executable Playwright test cases.

It combines Jira integration, Gemini AI, Playwright automation, failure analysis, and human-approved test repair into a structured QA workflow.

The goal is to reduce manual effort in test-case creation, test execution, failure investigation, and test maintenance.

## Key Features

- **Jira Requirement Analysis:** Retrieves Jira issue requirements using the Jira REST API.
- **AI-Powered Test Generation:** Uses Google Gemini AI to analyze requirements and generate structured test scenarios.
- **Playwright Automation:** Generates and executes JavaScript-based Playwright test cases.
- **Acceptance Criteria Mapping:** Connects generated test cases with individual Jira acceptance criteria.
- **Mock EventHub Application:** Provides an isolated application for safely testing login, event selection, and ticket booking.
- **Automated Test Reporting:** Generates structured JSON reports containing execution status, passed tests, failed tests, and acceptance-criteria results.
- **AI-Assisted Failure Analysis:** Analyzes test failures and provides repair suggestions, with deterministic fallback when AI analysis is unavailable.
- **Human-Approved Self-Healing:** Generates controlled repair proposals and validates changes before applying them with explicit human approval.
- **Dashboard:** Displays Jira requirements, test scenarios, execution results, failure analysis, and repair status.
- **GitHub Workflow:** Prepares pull request content for code review.

## Technologies Used

| Category | Technology |
|---|---|
| Programming Language | JavaScript |
| Backend | Node.js, Express.js |
| Test Automation | Playwright |
| AI Integration | Google Gemini API |
| Requirement Management | Jira REST API |
| Version Control | Git, GitHub |
| Frontend | HTML, CSS, JavaScript |
| Reporting | JSON |
| Testing Environment | Local Mock EventHub Application |


## MCP Server Integration

JiraPilot AI uses Model Context Protocol (MCP) integrations in its AI-assisted development and agent environment to connect AI agents with external tools and services.

MCP provides a standardized way for AI agents to access external capabilities through dedicated MCP servers.

### MCP Servers Used

| MCP Server | Purpose |
|---|---|
| Atlassian MCP Server | Connects agents with Jira to retrieve issue details and requirements. |
| GitHub MCP Server | Provides access to GitHub repository and pull-request workflows. |
| Playwright MCP Server | Provides browser interaction and automation tools for testing workflows. |

### How MCP Supports the Workflow

- **Atlassian MCP:** Helps agents access Jira issue information and acceptance criteria.
- **GitHub MCP:** Supports repository-related operations and pull-request workflows.
- **Playwright MCP:** Provides browser automation capabilities to interact with web applications.

These MCP integrations extend the capabilities of the AI-assisted agent environment by connecting it with external development and testing tools.

**Note:** MCP server integrations are part of the agent/tooling environment. The submitted application's local test execution is handled by its Node.js Playwright runner; the application backend should not be described as hosting these MCP servers.

## Project Workflow

```text
        Jira Requirement
               |
               v
      Requirement Analysis
               |
               v
       Gemini AI Analysis
               |
               v
      Test Case Generation
               |
               v
       Playwright Execution
               |
               v
        Test Result Report
               |
               v
         Failure Analysis
               |
               v
       Repair Proposal
               |
               v
       Human Approval
               |
               v
       Validated Test Repair
               |
               v
       Dashboard & GitHub
```

## Main Project Implementation

### 1. Jira Integration

- Connects with Jira through the Jira REST API.
- Retrieves issue details using a Jira issue key.
- Uses acceptance criteria as input for test scenario generation.

**Example Jira Issue:** `APJTPAA-1`

### 2. AI-Based Test Case Generation

- Integrates Google Gemini AI.
- Analyzes Jira requirements and acceptance criteria.
- Generates structured Playwright test scenarios.
- Maps scenarios to acceptance criteria.

### 3. Playwright Test Automation

Implemented seven acceptance-criteria-based test cases:

| Test ID | Test Scenario |
|---|---|
| AC-01 | Open the EventHub application |
| AC-02 | Log in with configured test credentials |
| AC-03 | Select the evidenced EventHub event |
| AC-04 | Record available seats before booking |
| AC-05 | Book exactly one ticket |
| AC-06 | Verify booking confirmation |
| AC-07 | Verify exactly one seat is deducted |

### 4. Mock EventHub Application

Developed an isolated local mock application to simulate the ticket-booking workflow.

It supports:
- User login simulation.
- Event selection.
- Available seat count verification.
- Single-ticket booking.
- Booking confirmation.
- Controlled failure simulation.

The mock environment allows automated tests to run without creating real EventHub bookings.

### 5. Failure Analysis and Self-Healing

Implemented a controlled failure-analysis and repair workflow.

- Identifies failed test cases.
- Analyzes failure information using AI-assisted analysis with deterministic fallback.
- Generates repair proposals.
- Validates proposed source-code changes.
- Checks source hashes and candidate syntax.
- Creates backups before applying approved repairs.
- Requires explicit human approval before modifying the generated test.

The supported repair is intentionally restricted to a specific seat-count parser correction. It does not automatically weaken test assertions.

### 6. Dashboard and Reporting

The Express.js dashboard displays:
- Jira issue information.
- Generated test scenarios.
- Acceptance criteria coverage.
- Test execution results.
- Failure analysis.
- Repair proposal and approval status.

Structured JSON reports are generated to maintain execution history.

## Testing Results

The project was tested against the local mock EventHub application.

**Final verified execution:**

| Metric | Result |
|---|---:|
| Total tests | 7 |
| Passed | 7 |
| Failed | 0 |
| Skipped | 0 |
| Environment | Local Mock EventHub |

The controlled failure workflow was also demonstrated, including repair proposal generation, human approval, and successful re-execution of the supported tests.

## Installation and Setup

### Prerequisites

- Node.js and npm.
- Git.
- A Jira account and API access for Jira integration.
- A Google Gemini API key for AI-powered analysis and generation.

### 1. Clone the Repository

```bash
git clone https://github.com/saloni-wadhawal/JiraPilot-AI.git
```

### 2. Navigate to the Project

```bash
cd JiraPilot-AI
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a local `.env` file and configure the required Jira and Gemini credentials according to the application's configuration.

**Important:** Never commit `.env` files, API keys, passwords, or other secrets to GitHub.

### 5. Start the Application

```bash
npm start
```

Open the dashboard at:

```text
http://localhost:3000
```

## Running Automated Tests

### Run the Local Mock Test Suite

```bash
npm run test:apjtpaa-1
```

### Run the Controlled Failure Scenario

```bash
npm run test:apjtpaa-1:mock:failure
```

This command intentionally simulates a failure in the local mock environment for testing the failure-analysis workflow.

### Live EventHub Testing

The project has a separate live testing configuration:

```bash
npm run test:live:eventhub
```

**Warning:** This workflow can interact with the real EventHub application and create an actual booking. Use it only with explicit authorization and appropriate test credentials. The seven-test result reported above was obtained using the local mock application, not the live website.

## Project Structure

```text
JiraPilot-AI/
│
├── .github/
│   ├── agents/
│   │   ├── jirapilot-orchestrator.agent.md
│   │   ├── requirement-analyst.agent.md
│   │   ├── test-case-generator.agent.md
│   │   ├── test-execution.agent.md
│   │   └── github-pr.agent.md
│   └── copilot-instructions.md
│
├── generated/
│   └── APJTPAA-1-test-plan.json
│
├── public/
│   └── index.html
│
├── src/
│   └── execution/
│       ├── failure-analysis.js
│       ├── json-reporter.js
│       └── run-generated-tests.js
│
├── tests/
│   ├── generated/
│   │   └── APJTPAA-1.spec.js
│   └── mock-eventhub/
│       └── server.js
│
├── playwright.config.js
├── playwright.live.config.js
├── server.js
├── package.json
└── README.md
```

## Safety and Validation

- Local mock testing is isolated from external websites.
- Test repair requires human approval.
- Original test files are backed up before approved repairs.
- Source hashes and syntax validation help prevent unintended changes.
- Sensitive credentials are maintained outside version control.
- Live EventHub execution is separate from local mock testing.

## Current Limitations

- The final seven-test verification was performed against the local mock application. Live EventHub execution has not been verified.
- Specialist agent profiles and an orchestrated workflow are implemented, but fully autonomous agent-to-agent delegation has not been verified.
- Automated GitHub pull request publication is not enabled; pull request content is prepared for review and publication is handled separately.
- The supported self-healing repair is intentionally limited to a specific test-code correction.

## Future Improvements

- Expand supported test-repair scenarios while maintaining human approval.
- Verify agent-to-agent delegation and coordination.
- Add automated CI/CD execution and reporting.
- Expand test coverage for additional Jira requirements.
- Validate the workflow against an authorized live test environment.

## Author

**Saloni Wadhawal**

GitHub: https://github.com/saloni-wadhawal

**Repository:** https://github.com/saloni-wadhawal/JiraPilot-AI

---

*JiraPilot AI demonstrates the practical integration of AI-assisted software testing, Jira requirement analysis, Playwright automation, failure analysis, and controlled self-healing into a unified QA workflow.*
