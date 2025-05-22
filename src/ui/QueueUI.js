import QueueSimulator from '../simulators/QueueSimulator.js';

/**
 * UI Controller for Queue Simulator
 * Handles UI interactions and visualization for the Queue Simulator
 */
class QueueUI {
  /**
   * Constructor for the Queue UI Controller
   */
  constructor() {
    this.simulator = new QueueSimulator();
    this.queueChart = null;
    this.activeChartType = 'queue';
    this.simulationResults = null;
  }

  /**
   * Initialize the UI
   */
  initialize() {
    this.setupEventListeners();
    this.setupChartTabSwitching();
    this.updateDurationMonths();
    this.updateTotalSlots();
  }

  /**
   * Set up event listeners for UI elements
   */
  setupEventListeners() {
    // Run simulation button
    const runButton = document.getElementById('run-queue-simulation');
    if (runButton) {
      runButton.addEventListener('click', () => this.runSimulation());
    }

    // Duration input
    const durationInput = document.getElementById('queue-duration');
    if (durationInput) {
      durationInput.addEventListener('input', () => this.updateDurationMonths());
    }

    // Intervention type radios
    const interventionTypeRadios = document.querySelectorAll('input[name="intervention-type"]');
    interventionTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleInterventionTypeChange());
    });

    // Slots inputs
    const queueSlotsInput = document.getElementById('queue-slots');
    if (queueSlotsInput) {
      queueSlotsInput.addEventListener('input', () => this.updateTotalSlots());
    }

    const queueAddedSlotsInput = document.getElementById('queue-added-slots');
    if (queueAddedSlotsInput) {
      queueAddedSlotsInput.addEventListener('input', () => this.updateTotalSlots());
    }

    const queueInterventionSlotsInput = document.getElementById('queue-intervention-slots');
    if (queueInterventionSlotsInput) {
      queueInterventionSlotsInput.addEventListener('input', () => this.updateSlotsChange());
    }
  }

  /**
   * Set up chart tab switching
   */
  setupChartTabSwitching() {
    const chartTabs = document.querySelectorAll('.queue-simulator-chart-tab');
    chartTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        chartTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        this.activeChartType = tab.getAttribute('data-chart');
        if (this.simulationResults) {
          this.updateQueueChart(this.simulationResults);
        }
      });
    });
  }

  /**
   * Update duration months display
   */
  updateDurationMonths() {
    const weeks = parseInt(document.getElementById('queue-duration').value);
    const months = Math.round(weeks / 4);
    document.getElementById('duration-months').textContent = months;
  }

  /**
   * Handle intervention type change
   */
  handleInterventionTypeChange() {
    const interventionType = document.querySelector('input[name="intervention-type"]:checked').value;
    const addedSlotsGroup = document.getElementById('added-slots-group');
    const interventionSlotsGroup = document.getElementById('intervention-slots-group');
    
    if (interventionType === 'add') {
      addedSlotsGroup.style.display = 'block';
      interventionSlotsGroup.style.display = 'none';
      this.updateTotalSlots();
    } else {
      addedSlotsGroup.style.display = 'none';
      interventionSlotsGroup.style.display = 'block';
      this.updateSlotsChange();
    }
  }

  /**
   * Update total slots display
   */
  updateTotalSlots() {
    const slotsPerWeek = parseInt(document.getElementById('queue-slots').value);
    const addedSlots = parseInt(document.getElementById('queue-added-slots').value);
    document.getElementById('total-slots').textContent = slotsPerWeek + addedSlots;
    document.getElementById('queue-intervention-slots').value = slotsPerWeek + addedSlots;
  }

  /**
   * Update slots change display
   */
  updateSlotsChange() {
    const slotsPerWeek = parseInt(document.getElementById('queue-slots').value);
    const interventionSlots = parseInt(document.getElementById('queue-intervention-slots').value);
    const change = interventionSlots - slotsPerWeek;
    document.getElementById('slots-change').textContent = change > 0 ? `+${change}` : change;
    document.getElementById('queue-added-slots').value = Math.max(0, change);
  }

  /**
   * Run the simulation
   */
  runSimulation() {
    const params = this.getSimulationParams();
    
    // Initialize and run the simulation
    this.simulator.initialize(params);
    const results = this.simulator.run();
    
    // Store the results
    this.simulationResults = results;
    
    // Update the UI with results
    this.updateResultsUI(results);
  }

  /**
   * Get simulation parameters from UI
   * @returns {Object} - Parameters object
   */
  getSimulationParams() {
    const avgArrivalsPerWeek = parseInt(document.getElementById('queue-arrivals').value);
    const slotsPerWeek = parseInt(document.getElementById('queue-slots').value);
    const initialQueueSize = parseInt(document.getElementById('queue-initial').value);
    const interventionSlots = parseInt(document.getElementById('queue-intervention-slots').value);
    const simulationDurationWeeks = parseInt(document.getElementById('queue-duration').value);
    
    return {
      avgArrivalsPerWeek,
      slotsPerWeek,
      initialQueueSize,
      interventionSlots,
      simulationDurationWeeks
    };
  }

  /**
   * Update the results UI with simulation results
   * @param {Object} results - Simulation results
   */
  updateResultsUI(results) {
    // Update results display
    document.getElementById('baseline-wait').textContent = results.baselineResults.avgWaitTime.toFixed(1);
    document.getElementById('baseline-queue').textContent = results.baselineResults.finalQueueLength;
    document.getElementById('baseline-surgeries').textContent = results.baselineResults.totalSurgeries;
    
    document.getElementById('intervention-wait').textContent = results.interventionResults.avgWaitTime.toFixed(1);
    document.getElementById('intervention-queue').textContent = results.interventionResults.finalQueueLength;
    document.getElementById('intervention-surgeries').textContent = results.interventionResults.totalSurgeries;
    
    // Show results and update chart
    document.getElementById('queue-results-content').style.display = 'block';
    document.getElementById('queue-no-results').style.display = 'none';
    
    this.updateQueueChart(results);
  }

  /**
   * Update queue chart with new data
   * @param {Object} results - Simulation results
   */
  updateQueueChart(results) {
    if (!results) return;
    
    const ctx = document.getElementById('queue-chart').getContext('2d');
    
    if (this.queueChart) {
      this.queueChart.destroy();
    }
    
    const weeks = Array.from({length: results.baselineResults.weeklyQueueLengths.length}, (_, i) => i + 1);
    
    let chartData, chartOptions;
    
    if (this.activeChartType === 'queue') {
      chartData = {
        labels: weeks,
        datasets: [
          {
            label: 'Perustilanne',
            data: results.baselineResults.weeklyQueueLengths,
            borderColor: '#2a6ebb',
            backgroundColor: 'rgba(42, 110, 187, 0.1)',
            fill: true
          },
          {
            label: 'Intervention jälkeen',
            data: results.interventionResults.weeklyQueueLengths,
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            fill: true
          }
        ]
      };
      
      chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Jonon pituuden kehitys',
            font: { size: 16 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Jonossa olevien potilaiden määrä' }
          },
          x: {
            title: { display: true, text: 'Viikko' }
          }
        }
      };
    } else if (this.activeChartType === 'surgeries') {
      chartData = {
        labels: weeks.slice(0, results.baselineResults.weeklySurgeries.length),
        datasets: [
          {
            label: 'Perustilanne',
            data: results.baselineResults.weeklySurgeries,
            borderColor: '#2a6ebb',
            backgroundColor: '#2a6ebb',
            type: 'bar'
          },
          {
            label: 'Intervention jälkeen',
            data: results.interventionResults.weeklySurgeries,
            borderColor: '#e74c3c',
            backgroundColor: '#e74c3c',
            type: 'bar'
          }
        ]
      };
      
      chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Viikoittaiset leikkaukset',
            font: { size: 16 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Leikkausten määrä' }
          },
          x: {
            title: { display: true, text: 'Viikko' }
          }
        }
      };
    } else if (this.activeChartType === 'cumulative') {
      const cumulativeBaseline = [];
      const cumulativeIntervention = [];
      
      let baselineSum = 0;
      let interventionSum = 0;
      
      for (let i = 0; i < results.baselineResults.weeklySurgeries.length; i++) {
        baselineSum += results.baselineResults.weeklySurgeries[i];
        interventionSum += results.interventionResults.weeklySurgeries[i];
        
        cumulativeBaseline.push(baselineSum);
        cumulativeIntervention.push(interventionSum);
      }
      
      chartData = {
        labels: weeks.slice(0, results.baselineResults.weeklySurgeries.length),
        datasets: [
          {
            label: 'Perustilanne',
            data: cumulativeBaseline,
            borderColor: '#2a6ebb',
            backgroundColor: 'rgba(42, 110, 187, 0.1)',
            fill: true
          },
          {
            label: 'Intervention jälkeen',
            data: cumulativeIntervention,
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            fill: true
          }
        ]
      };
      
      chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Kumulatiiviset leikkaukset',
            font: { size: 16 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Leikkausten kokonaismäärä' }
          },
          x: {
            title: { display: true, text: 'Viikko' }
          }
        }
      };
    }
    
    this.queueChart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: chartOptions
    });
  }
}

// Export the QueueUI class
export default QueueUI;
