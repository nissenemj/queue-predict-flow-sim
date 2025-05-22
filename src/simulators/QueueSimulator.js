import SimulationEngine from './SimulationEngine.js';
import Patient from '../models/Patient.js';

/**
 * Queue Simulator class
 * Simulates surgical queues and interventions
 */
class QueueSimulator extends SimulationEngine {
  /**
   * Constructor for the Queue Simulator
   */
  constructor() {
    super();
    this.weeklyQueue = [];
    this.weeklySurgeries = [];
    this.weeklyArrivals = [];
    this.weeklyWaitTimes = [];
    this.interventionWeek = 0;
    this.baselineResults = null;
    this.interventionResults = null;
  }

  /**
   * Initialize the simulation with configuration
   * @param {Object} config - Configuration parameters for the simulation
   */
  initialize(config) {
    super.initialize(config);
    
    this.weeklyQueue = [config.initialQueueSize];
    this.weeklySurgeries = [];
    this.weeklyArrivals = [];
    this.weeklyWaitTimes = [];
    
    // Set intervention week (default to halfway through simulation)
    this.interventionWeek = config.interventionWeek || Math.floor(config.simulationDurationWeeks / 2);
    
    // Initialize arrays for weekly data
    const totalWeeks = config.simulationDurationWeeks;
    this.weeklyArrivals = new Array(totalWeeks).fill(0);
  }

  /**
   * Run the simulation
   * @returns {Object} - The simulation results
   */
  run() {
    const config = this.config;
    const weeks = config.simulationDurationWeeks;
    
    // Run baseline simulation
    const baselineQueue = [config.initialQueueSize];
    const baselineSurgeries = [];
    
    // Run intervention simulation
    const interventionQueue = [config.initialQueueSize];
    const interventionSurgeries = [];
    
    // Generate weekly data
    for (let week = 1; week < weeks; week++) {
      // Generate arrivals for this week (using Poisson distribution)
      const arrivals = this.poissonRandom(config.avgArrivalsPerWeek);
      this.weeklyArrivals[week] = arrivals;
      
      // Baseline: new arrivals minus surgeries performed
      const baselineSlotsPerWeek = config.slotsPerWeek;
      const baselineSurgeriesPossible = Math.min(baselineQueue[week-1], baselineSlotsPerWeek);
      baselineSurgeries.push(baselineSurgeriesPossible);
      const baselineNewQueue = baselineQueue[week-1] + arrivals - baselineSurgeriesPossible;
      baselineQueue.push(Math.max(0, baselineNewQueue));
      
      // Intervention: new arrivals minus surgeries performed with intervention
      const interventionSlotsPerWeek = week >= this.interventionWeek ? config.interventionSlots : config.slotsPerWeek;
      const interventionSurgeriesPossible = Math.min(interventionQueue[week-1], interventionSlotsPerWeek);
      interventionSurgeries.push(interventionSurgeriesPossible);
      const interventionNewQueue = interventionQueue[week-1] + arrivals - interventionSurgeriesPossible;
      interventionQueue.push(Math.max(0, interventionNewQueue));
      
      // Calculate wait times
      this.calculateWaitTimes(week, baselineQueue[week], interventionQueue[week], baselineSlotsPerWeek, interventionSlotsPerWeek);
    }
    
    // Add the last week's surgeries
    const lastBaselineSurgeries = Math.min(baselineQueue[weeks-1], config.slotsPerWeek);
    const lastInterventionSurgeries = Math.min(interventionQueue[weeks-1], config.interventionSlots);
    baselineSurgeries.push(lastBaselineSurgeries);
    interventionSurgeries.push(lastInterventionSurgeries);
    
    // Store results
    this.baselineResults = this.calculateResults(baselineQueue, baselineSurgeries, config.slotsPerWeek);
    this.interventionResults = this.calculateResults(interventionQueue, interventionSurgeries, config.interventionSlots);
    
    return {
      baselineResults: this.baselineResults,
      interventionResults: this.interventionResults
    };
  }

  /**
   * Calculate wait times for a given week
   * @param {number} week - Week number
   * @param {number} baselineQueueSize - Baseline queue size
   * @param {number} interventionQueueSize - Intervention queue size
   * @param {number} baselineSlotsPerWeek - Baseline slots per week
   * @param {number} interventionSlotsPerWeek - Intervention slots per week
   */
  calculateWaitTimes(week, baselineQueueSize, interventionQueueSize, baselineSlotsPerWeek, interventionSlotsPerWeek) {
    // Calculate average wait time in days
    // Simple formula: queue size / (slots per week / 7)
    const baselineWaitTime = baselineQueueSize > 0 ? 
      baselineQueueSize / (baselineSlotsPerWeek / 7) : 0;
    
    const interventionWaitTime = interventionQueueSize > 0 ? 
      interventionQueueSize / (interventionSlotsPerWeek / 7) : 0;
    
    // Store wait times
    if (!this.weeklyWaitTimes[week]) {
      this.weeklyWaitTimes[week] = {};
    }
    
    this.weeklyWaitTimes[week].baseline = baselineWaitTime;
    this.weeklyWaitTimes[week].intervention = interventionWaitTime;
  }

  /**
   * Calculate results for a simulation run
   * @param {Array} queueLengths - Weekly queue lengths
   * @param {Array} surgeries - Weekly surgeries performed
   * @param {number} slotsPerWeek - Slots per week
   * @returns {Object} - Results object
   */
  calculateResults(queueLengths, surgeries, slotsPerWeek) {
    // Calculate average wait time
    const finalQueueLength = queueLengths[queueLengths.length - 1];
    const avgWaitTime = finalQueueLength > 0 ? 
      finalQueueLength / (slotsPerWeek / 7) : 0;
    
    // Cap wait time at simulation duration
    const cappedWaitTime = Math.min(avgWaitTime, this.config.simulationDurationWeeks * 7);
    
    // Calculate total surgeries
    const totalSurgeries = surgeries.reduce((a, b) => a + b, 0);
    
    return {
      avgWaitTime: cappedWaitTime,
      finalQueueLength: finalQueueLength,
      totalSurgeries: totalSurgeries,
      weeklyQueueLengths: queueLengths,
      weeklySurgeries: surgeries
    };
  }

  /**
   * Generate a random number from a Poisson distribution
   * @param {number} lambda - Expected value
   * @returns {number} - Random number from Poisson distribution
   */
  poissonRandom(lambda) {
    if (lambda <= 0) return 0;
    
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    
    return k - 1;
  }

  /**
   * Collect results from the simulation
   * @returns {Object} - The simulation results
   */
  collectResults() {
    return {
      baselineResults: this.baselineResults,
      interventionResults: this.interventionResults
    };
  }
}

// Export the QueueSimulator class
export default QueueSimulator;
