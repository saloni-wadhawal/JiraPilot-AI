
require('dotenv').config();

const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

function getDescriptionText(node) {
    if (!node) return '';

    if (Array.isArray(node)) {
        return node.map(getDescriptionText).join('');
    }

    if (typeof node === 'string') {
        return node;
    }

    let text = node.text || '';

    if (node.type === 'hardBreak') text += '\n';

    if (node.content) {
        text += getDescriptionText(node.content);
    }

    if (['paragraph', 'heading', 'listItem'].includes(node.type)) {
        text += '\n';
    }

    return text;
}

app.post('/api/analyze', async (req, res) => {
    try {
        const issueKey = (
            req.body.issue || process.env.JIRA_ISSUE_KEY || ''
        ).trim().toUpperCase();

        if (!process.env.JIRA_BASE_URL ||
            !process.env.JIRA_EMAIL ||
            !process.env.JIRA_API_TOKEN) {
            return res.status(500).json({
                error: 'Check your Jira settings in .env.'
            });
        }

        if (!ai) {
            return res.status(500).json({
                error: 'GEMINI_API_KEY is missing from .env.'
            });
        }

        if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(issueKey)) {
            return res.status(400).json({
                error: 'Enter a valid Jira issue key, e.g. APJTPAA-1.'
            });
        }

        const credentials = Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
        ).toString('base64');

        const jiraUrl =
            `${process.env.JIRA_BASE_URL.replace(/\/+$/, '')}` +
            `/rest/api/3/issue/${encodeURIComponent(issueKey)}`;

        const jiraResponse = await fetch(jiraUrl, {
            headers: {
                Authorization: `Basic ${credentials}`,
                Accept: 'application/json'
            }
        });

        if (!jiraResponse.ok) {
            return res.status(jiraResponse.status).json({
                error: `Jira request failed (${jiraResponse.status}). Check your Jira credentials, permissions, and issue key.`
            });
        }

        const jiraData = await jiraResponse.json();

        const summary = jiraData.fields.summary || '';
        const description =
            getDescriptionText(jiraData.fields.description).trim();

        const requirement = [
            `Jira issue: ${issueKey}`,
            `Summary: ${summary}`,
            `Description: ${description}`,
            `Additional user requirement: ${req.body.requirement || ''}`
        ].join('\n');

        const prompt = `
You are a QA automation engineer.

Analyze this Jira requirement and create 4 to 6 useful,
specific test scenarios for a beginner Playwright JavaScript project.

Requirement:
${requirement}

Return ONLY valid JSON in this exact format:
{
  "scenarios": [
    {
      "title": "Short test title",
      "expected": "Expected result",
      "steps": ["Step one", "Step two"]
    }
  ]
}

Include positive and negative cases when relevant.
Do not invent credentials, selectors, or successful test results.
Do not claim tests have been executed.
`;

   
let result;

for (let attempt = 1; attempt <= 3; attempt++) {
    try {
        result = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        break;
    } catch (error) {
        const errorMessage = String(error.message || error);
        const isTemporary =
            /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|500|INTERNAL/i
                .test(errorMessage);

        if (!isTemporary || attempt === 3) {
            throw error;
        }

        console.log(
            `Gemini temporarily unavailable. Retry ${attempt}/3...`
        );

        await new Promise(resolve =>
            setTimeout(resolve, attempt * 3000)
        );
    }
}

if (!result) {
    throw new Error('Gemini did not return a response.');
}


        const generated = JSON.parse(result.text);

        if (!Array.isArray(generated.scenarios) ||
            generated.scenarios.length === 0) {
            throw new Error('Gemini returned no valid test scenarios.');
        }

        const scenarios = generated.scenarios.map((scenario) => ({
            title: String(scenario.title || 'Untitled test'),
            expected: String(scenario.expected || 'Expected result not provided'),
            steps: Array.isArray(scenario.steps)
                ? scenario.steps.map(String)
                : []
        }));

        res.json({
            mode: 'Jira + Gemini AI',
            issue: issueKey,
            summary,
            description,
            status: jiraData.fields.status?.name || 'Unknown',
            scenarios
        });

    } catch (error) {
        console.error('Analysis error:', error.message);

        res.status(500).json({
            error: 'Analysis failed. Check the server terminal for details.'
        });
    }
});


let testRunInProgress = false;

app.post('/api/run-tests', (req, res) => {
    if (testRunInProgress) {
        return res.status(409).json({
            error: 'A test run is already in progress.'
        });
    }

    testRunInProgress = true;

    const cliPath = require.resolve('@playwright/test/cli');
    const child = spawn(
        process.execPath,
        [
            cliPath,
            'test',
            'tests/eventhub-booking.spec.js',
            '--reporter=list'
        ],
        {
            cwd: __dirname,
            env: process.env,
            windowsHide: true
        }
    );

    let output = '';
    let finished = false;

    child.stdout.on('data', data => {
        output += data.toString();
    });

    child.stderr.on('data', data => {
        output += data.toString();
    });

    child.on('error', error => {
        if (finished) return;
        finished = true;
        testRunInProgress = false;

        res.status(500).json({
            error: 'Could not start Playwright.',
            details: error.message
        });
    });

    child.on('close', code => {
        if (finished) return;
        finished = true;
        testRunInProgress = false;

        const passedMatch = output.match(/(\d+)\s+passed/);
        const failedMatch = output.match(/(\d+)\s+failed/);

        res.json({
            success: code === 0,
            passed: passedMatch ? Number(passedMatch[1]) : 0,
            failed: failedMatch ? Number(failedMatch[1]) : 0,
            exitCode: code,
            output
        });
    });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
