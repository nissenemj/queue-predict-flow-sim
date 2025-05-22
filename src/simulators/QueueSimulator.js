import SimulationEngine from './SimulationEngine.js';
import Patient from '../models/Patient.js';

/**
 * Queue Simulator class
 * Simulates surgical queues and interventions
 */
class QueueSimulator extends SimulationEngine {
  /**
   * Constructor for the Queue Simulator
   * @param {Object} options - Simulation options
   */
  constructor(options = {}) {
    super(options);
    this.weeklyQueue = [];
    this.weeklySurgeries = [];
    this.weeklyArrivals = [];
    this.weeklyWaitTimes = [];
    this.interventionWeek = 0;
    this.baselineResults = null;
    this.interventionResults = null;

    // Register event handlers
    this.registerEventHandler('weekly_update', this.processWeeklyUpdate.bind(this));
    this.registerEventHandler('intervention_start', this.processInterventionStart.bind(this));
    this.registerEventHandler('simulation_end', this.processSimulationEnd.bind(this));
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

    // Log initialization
    this.logger.info('queue', 'Queue Simulator initialized', null, {
      config: this.config,
      totalWeeks,
      interventionWeek: this.interventionWeek
    }, this.currentTime);
  }

  /**
   * Run the simulation
   * @returns {Object} - The simulation results
   */
  run() {
    const config = this.config;
    const weeks = config.simulationDurationWeeks;

    // Initialize baseline and intervention queues
    this.baselineQueue = [config.initialQueueSize];
    this.baselineSurgeries = [];
    this.interventionQueue = [config.initialQueueSize];
    this.interventionSurgeries = [];

    // Schedule weekly updates
    for (let week = 1; week < weeks; week++) {
      // Schedule weekly update event
      this.scheduleEvent(week * 7 * 24 * 60, { week }, 'weekly_update');

      // Schedule intervention start event
      if (week === this.interventionWeek) {
        this.scheduleEvent(week * 7 * 24 * 60, { week }, 'intervention_start');
      }
    }

    // Schedule simulation end event
    this.scheduleEvent(weeks * 7 * 24 * 60, { weeks }, 'simulation_end');

    // Run the simulation
    super.run(weeks * 7 * 24 * 60);

    return {
      baselineResults: this.baselineResults,
      interventionResults: this.interventionResults
    };
  }

  /**
   * Process weekly update event
   * @param {Object} event - The event object
   */
  processWeeklyUpdate(event) {
    const { time, data } = event;
    const { week } = data;
    const config = this.config;

    // Generate arrivals for this week (using Poisson distribution)
    const arrivals = this.poissonRandom(config.avgArrivalsPerWeek);
    this.weeklyArrivals[week] = arrivals;

    // Log weekly arrivals
    this.logger.info('queue', `Week ${week}: ${arrivals} new patients arrived`, null, {
      week,
      arrivals,
      totalArrivals: this.weeklyArrivals.reduce((sum, val) => sum + val, 0)
    }, time);

    // Baseline: new arrivals minus surgeries performed
    const baselineSlotsPerWeek = config.slotsPerWeek;
    const baselineSurgeriesPossible = Math.min(this.baselineQueue[week - 1], baselineSlotsPerWeek);
    this.baselineSurgeries.push(baselineSurgeriesPossible);
    const baselineNewQueue = this.baselineQueue[week - 1] + arrivals - baselineSurgeriesPossible;
    this.baselineQueue.push(Math.max(0, baselineNewQueue));

    // Intervention: new arrivals minus surgeries performed with intervention
    const interventionSlotsPerWeek = week >= this.interventionWeek ? config.interventionSlots : config.slotsPerWeek;
    const interventionSurgeriesPossible = Math.min(this.interventionQueue[week - 1], interventionSlotsPerWeek);
    this.interventionSurgeries.push(interventionSurgeriesPossible);
    const interventionNewQueue = this.interventionQueue[week - 1] + arrivals - interventionSurgeriesPossible;
    this.interventionQueue.push(Math.max(0, interventionNewQueue));

    // Calculate wait times
    this.calculateWaitTimes(week, this.baselineQueue[week], this.interventionQueue[week], baselineSlotsPerWeek, interventionSlotsPerWeek);

    // Log weekly statistics
    this.logger.info('queue', `Week ${week} statistics`, null, {
      week,
      baselineQueue: this.baselineQueue[week],
      baselineSurgeries: baselineSurgeriesPossible,
      interventionQueue: this.interventionQueue[week],
      interventionSurgeries: interventionSurgeriesPossible,
      baselineWaitTime: this.weeklyWaitTimes[week]?.baseline,
      interventionWaitTime: this.weeklyWaitTimes[week]?.intervention
    }, time);
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
   * Process intervention start event
   * @param {Object} event - The event object
   */
  processInterventionStart(event) {
    const { time, data } = event;
    const { week } = data;

    this.logger.info('queue', `Intervention started at week ${week}`, null, {
      week,
      baselineSlotsPerWeek: this.config.slotsPerWeek,
      interventionSlots: this.config.interventionSlots,
      queueSizeAtIntervention: this.interventionQueue[week - 1]
    }, time);
  }

  /**
   * Process simulation end event
   * @param {Object} event - The event object
   */
  processSimulationEnd(event) {
    const { time, data } = event;
    const { weeks } = data;

    // Add the last week's surgeries
    const lastBaselineSurgeries = Math.min(this.baselineQueue[weeks - 1], this.config.slotsPerWeek);
    const lastInterventionSurgeries = Math.min(this.interventionQueue[weeks - 1], this.config.interventionSlots);
    this.baselineSurgeries.push(lastBaselineSurgeries);
    this.interventionSurgeries.push(lastInterventionSurgeries);

    // Store results
    this.baselineResults = this.calculateResults(this.baselineQueue, this.baselineSurgeries, this.config.slotsPerWeek);
    this.interventionResults = this.calculateResults(this.interventionQueue, this.interventionSurgeries, this.config.interventionSlots);

    // Log final results
    this.logger.info('results', 'Simulation completed', null, {
      baselineResults: {
        finalQueueLength: this.baselineResults.finalQueueLength,
        totalSurgeries: this.baselineResults.totalSurgeries,
        avgWaitTime: this.baselineResults.avgWaitTime
      },
      interventionResults: {
        finalQueueLength: this.interventionResults.finalQueueLength,
        totalSurgeries: this.interventionResults.totalSurgeries,
        avgWaitTime: this.interventionResults.avgWaitTime
      },
      improvement: {
        queueReduction: this.baselineResults.finalQueueLength - this.interventionResults.finalQueueLength,
        additionalSurgeries: this.interventionResults.totalSurgeries - this.baselineResults.totalSurgeries,
        waitTimeReduction: this.baselineResults.avgWaitTime - this.interventionResults.avgWaitTime
      }
    }, time);
  }

  /**
   * Collect results from the simulation
   * @returns {Object} - The simulation results
   */
  collectResults() {
    // Get simulation statistics
    const simStats = this.getStatistics();

    // Add simulation statistics to results
    const results = {
      baselineResults: this.baselineResults ? {
        ...this.baselineResults,
        simulation_stats: simStats
      } : null,
      interventionResults: this.interventionResults ? {
        ...this.interventionResults,
        simulation_stats: simStats
      } : null
    };

    return results;
  }
}

// Export the QueueSimulator class
export default QueueSimulator;
