import testMLIntegration from './test-ml-integration.js';

// Run the ML integration tests
testMLIntegration().catch(error => {
  console.error('Error running ML integration tests:', error);
});
