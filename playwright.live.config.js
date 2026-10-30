const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/eventhub-booking.spec.js',
  outputDir: './test-results/eventhub-live',
  reporter: [
    ['html', {
      outputFolder: './playwright-report/eventhub-live',
      open: 'never'
    }]
  ],
  globalSetup: './tests/generated/require-eventhub-approval.js',
  workers: 1,
  retries: 0
});
