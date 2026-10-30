const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/generated',
  testMatch: '**/APJTPAA-1.spec.js',
  outputDir: './test-results/APJTPAA-1',
  reporter: [
    ['html', {
      outputFolder: './playwright-report/APJTPAA-1',
      open: 'never'
    }],
    ['./src/execution/json-reporter.js']
  ],
  webServer: {
    command: 'node tests/mock-eventhub/server.js',
    url: 'http://127.0.0.1:4173/health',
    reuseExistingServer: false,
    timeout: 10000
  },
  use: {
    baseURL: 'http://127.0.0.1:4173'
  },
  workers: 1,
  retries: 0
});
