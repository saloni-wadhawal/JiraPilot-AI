async function requireExplicitEventHubApproval() {
  if (process.env.JIRAPILOT_ALLOW_EVENTHUB_LIVE_TESTS !== 'true') {
    throw new Error(
      'Live EventHub tests are blocked by default. Set ' +
      'JIRAPILOT_ALLOW_EVENTHUB_LIVE_TESTS=true only after explicitly ' +
      'approving this test run and its target environment.'
    );
  }
}

module.exports = requireExplicitEventHubApproval;
