import ERFlowSimulator from '../simulators/ERFlowSimulator.js';
import QueueSimulator from '../simulators/QueueSimulator.js';

/**
 * Test the updated simulators
 */
const testUpdatedSimulators = () => {
  console.log('=== Testing Updated Simulators ===');

  // Test ER Flow Simulator
  testERFlowSimulator();

  // Test Queue Simulator
  testQueueSimulator();

  console.log('=== Testing Complete ===');
};

/**
 * Test the ER Flow Simulator
 */
const testERFlowSimulator = () => {
  console.log('\n--- Testing ER Flow Simulator ---');

  // Create simulator with debug mode enabled
  const simulator = new ERFlowSimulator({ debug: true });

  // Initialize with configuration
  simulator.initialize({
    arrival_rates: {
      morning: 5,
      afternoon: 4,
      evening: 3,
      night: 2
    },
    staff: {
      doctors: {
        day: 3,
        evening: 2,
        night: 1
      },
      nurses: {
        day: 6,
        evening: 4,
        night: 2
      }
    },
    ed_beds_capacity: 20,
    ward_beds_capacity: 100,
    duration_days: 3
  });

  console.log('ER Flow Simulator initialized');
  console.log(`- Resources: ${simulator.getAllResources().length}`);
  console.log(`- Event queue size: ${simulator.eventQueue.getSize()}`);

  // Run the simulation
  console.log('Running ER Flow Simulator...');
  const results = simulator.run(3 * 24 * 60); // 3 days in minutes

  // Print results
  console.log('ER Flow Simulation completed');
  console.log(`- Processing time: ${results.simulation_stats.processing_time_ms} ms`);
  console.log(`- Events processed: ${results.simulation_stats.event_count}`);
  console.log(`- Average wait time: ${results.avg_wait.toFixed(1)} minutes`);
  console.log(`- Average length of stay: ${results.avg_los.toFixed(1)} days`);
  console.log(`- ED occupancy: ${results.ed_occupancy.toFixed(1)}%`);
  console.log(`- Ward occupancy: ${results.ward_occupancy.toFixed(1)}%`);
  console.log(`- Admitted patients: ${results.admitted_count}`);
  console.log(`- Discharged patients: ${results.discharged_count}`);

  // Check resource statistics
  const edBedsStats = results.resource_stats.ed_beds;
  const wardBedsStats = results.resource_stats.ward_beds;

  console.log('Resource statistics:');
  console.log(`- ED beds: ${edBedsStats.totalAllocations} allocations, peak: ${edBedsStats.peakAllocations}/${edBedsStats.capacity}`);
  console.log(`- Ward beds: ${wardBedsStats.totalAllocations} allocations, peak: ${wardBedsStats.peakAllocations}/${wardBedsStats.capacity}`);

  console.log('--- ER Flow Simulator Test Complete ---');
};

/**
 * Test the Queue Simulator
 */
const testQueueSimulator = () => {
  console.log('\n--- Testing Queue Simulator ---');

  // Create simulator with debug mode enabled
  const simulator = new QueueSimulator({ debug: true });

  // Initialize with configuration
  simulator.initialize({
    initialQueueSize: 100,
    avgArrivalsPerWeek: 15,
    slotsPerWeek: 12,
    interventionSlots: 18,
    interventionWeek: 5,
    simulationDurationWeeks: 12
  });

  console.log('Queue Simulator initialized');
  console.log(`- Event queue size: ${simulator.eventQueue.getSize()}`);

  // Run the simulation
  console.log('Running Queue Simulator...');
  const results = simulator.run();

  // Print results
  console.log('Queue Simulation completed');

  // Check if simulation_stats exists before accessing it
  if (results.baselineResults && results.baselineResults.simulation_stats) {
    console.log(`- Processing time: ${results.baselineResults.simulation_stats.processing_time_ms} ms`);
    console.log(`- Events processed: ${results.baselineResults.simulation_stats.event_count}`);
  } else {
    console.log('- Processing time: N/A');
    console.log('- Events processed: N/A');
  }

  console.log('Baseline results:');
  if (results.baselineResults) {
    console.log(`- Final queue length: ${results.baselineResults.finalQueueLength || 'N/A'}`);
    console.log(`- Average wait time: ${results.baselineResults.avgWaitTime ? results.baselineResults.avgWaitTime.toFixed(1) : 'N/A'} days`);
    console.log(`- Total surgeries: ${results.baselineResults.totalSurgeries || 'N/A'}`);
  } else {
    console.log('- No baseline results available');
  }

  console.log('Intervention results:');
  if (results.interventionResults) {
    console.log(`- Final queue length: ${results.interventionResults.finalQueueLength || 'N/A'}`);
    console.log(`- Average wait time: ${results.interventionResults.avgWaitTime ? results.interventionResults.avgWaitTime.toFixed(1) : 'N/A'} days`);
    console.log(`- Total surgeries: ${results.interventionResults.totalSurgeries || 'N/A'}`);
  } else {
    console.log('- No intervention results available');
  }

  // Calculate improvements if results are available
  console.log('Improvements:');

  if (results.baselineResults && results.interventionResults &&
    results.baselineResults.finalQueueLength !== undefined &&
    results.interventionResults.finalQueueLength !== undefined) {

    const queueReduction = results.baselineResults.finalQueueLength - results.interventionResults.finalQueueLength;
    const queueReductionPercent = results.baselineResults.finalQueueLength > 0 ?
      (queueReduction / results.baselineResults.finalQueueLength * 100) : 0;

    console.log(`- Queue reduction: ${queueReduction} patients (${queueReductionPercent.toFixed(1)}%)`);
  } else {
    console.log('- Queue reduction: N/A');
  }

  if (results.baselineResults && results.interventionResults &&
    results.baselineResults.avgWaitTime !== undefined &&
    results.interventionResults.avgWaitTime !== undefined) {

    const waitTimeReduction = results.baselineResults.avgWaitTime - results.interventionResults.avgWaitTime;
    const waitTimeReductionPercent = results.baselineResults.avgWaitTime > 0 ?
      (waitTimeReduction / results.baselineResults.avgWaitTime * 100) : 0;

    console.log(`- Wait time reduction: ${waitTimeReduction.toFixed(1)} days (${waitTimeReductionPercent.toFixed(1)}%)`);
  } else {
    console.log('- Wait time reduction: N/A');
  }

  if (results.baselineResults && results.interventionResults &&
    results.baselineResults.totalSurgeries !== undefined &&
    results.interventionResults.totalSurgeries !== undefined) {

    const additionalSurgeries = results.interventionResults.totalSurgeries - results.baselineResults.totalSurgeries;
    const additionalSurgeriesPercent = results.baselineResults.totalSurgeries > 0 ?
      (additionalSurgeries / results.baselineResults.totalSurgeries * 100) : 0;

    console.log(`- Additional surgeries: ${additionalSurgeries} (${additionalSurgeriesPercent.toFixed(1)}%)`);
  } else {
    console.log('- Additional surgeries: N/A');
  }

  console.log('--- Queue Simulator Test Complete ---');
};

// Run the tests
testUpdatedSimulators();

export default testUpdatedSimulators;
