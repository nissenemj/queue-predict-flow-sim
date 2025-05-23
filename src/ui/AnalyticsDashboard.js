/**
 * AnalyticsDashboard.js
 * Advanced analytics dashboard for hospital simulation
 */

import ChartRenderer from './ChartRenderer.js';

/**
 * Analytics Dashboard class
 * Provides a dashboard for visualizing simulation results and predictions
 */
class AnalyticsDashboard {
  /**
   * Constructor for the AnalyticsDashboard class
   * @param {Object} simulator - Simulator instance
   * @param {HTMLElement} container - Container element for the dashboard
   * @param {Object} options - Dashboard options
   */
  constructor(simulator, container, options = {}) {
    this.simulator = simulator;
    this.container = container;
    this.options = {
      refreshInterval: options.refreshInterval || 1000, // Refresh interval in ms
      darkMode: options.darkMode || false,
      showPredictions: options.showPredictions !== false,
      showRealTime: options.showRealTime !== false,
      showHistorical: options.showHistorical !== false,
      ...options
    };

    this.charts = new Map();
    this.data = {
      patientFlow: [],
      waitTimes: [],
      resourceUtilization: new Map(),
      patientOutcomes: [],
      predictions: {
        patientFlow: [],
        waitTimes: [],
        resourceUtilization: new Map(),
        patientOutcomes: []
      }
    };

    this.refreshIntervalId = null;
    this.initialized = false;
  }

  /**
   * Initialize the dashboard
   */
  initialize() {
    // Create dashboard structure
    this.createDashboardStructure();

    // Register event handlers
    this.registerEventHandlers();

    // Start refresh interval
    this.startRefreshInterval();

    this.initialized = true;
  }

  /**
   * Create dashboard structure
   */
  createDashboardStructure() {
    // Clear container
    this.container.innerHTML = '';

    // Set container style
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'auto';
    this.container.style.padding = '10px';
    this.container.style.boxSizing = 'border-box';
    this.container.style.fontFamily = 'Arial, sans-serif';

    if (this.options.darkMode) {
      this.container.style.backgroundColor = '#222';
      this.container.style.color = '#fff';
    }

    // Create header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '20px';
    header.style.padding = '10px';
    header.style.borderBottom = this.options.darkMode ? '1px solid #444' : '1px solid #ddd';

    const title = document.createElement('h1');
    title.textContent = 'Hospital Simulation Analytics Dashboard';
    title.style.margin = '0';
    title.style.fontSize = '24px';

    const controls = document.createElement('div');

    // Create refresh button
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh';
    refreshButton.style.padding = '8px 16px';
    refreshButton.style.marginLeft = '10px';
    refreshButton.style.backgroundColor = this.options.darkMode ? '#444' : '#f0f0f0';
    refreshButton.style.color = this.options.darkMode ? '#fff' : '#333';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '4px';
    refreshButton.style.cursor = 'pointer';

    refreshButton.addEventListener('click', () => {
      this.refreshDashboard();
    });

    // Create toggle for predictions
    const predictionsToggle = document.createElement('input');
    predictionsToggle.type = 'checkbox';
    predictionsToggle.id = 'predictions-toggle';
    predictionsToggle.checked = this.options.showPredictions;

    const predictionsLabel = document.createElement('label');
    predictionsLabel.htmlFor = 'predictions-toggle';
    predictionsLabel.textContent = 'Show Predictions';
    predictionsLabel.style.marginLeft = '10px';

    predictionsToggle.addEventListener('change', (event) => {
      this.options.showPredictions = event.target.checked;
      this.refreshDashboard();
    });

    controls.appendChild(predictionsLabel);
    controls.appendChild(predictionsToggle);
    controls.appendChild(refreshButton);

    header.appendChild(title);
    header.appendChild(controls);

    // Create main content area
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexWrap = 'wrap';
    content.style.gap = '20px';
    content.style.flex = '1';

    // Create sections
    const patientFlowSection = this.createSection('Patient Flow', 'patient-flow-section');
    const waitTimesSection = this.createSection('Wait Times', 'wait-times-section');
    const resourceUtilizationSection = this.createSection('Resource Utilization', 'resource-utilization-section');
    const patientOutcomesSection = this.createSection('Patient Outcomes', 'patient-outcomes-section');

    content.appendChild(patientFlowSection);
    content.appendChild(waitTimesSection);
    content.appendChild(resourceUtilizationSection);
    content.appendChild(patientOutcomesSection);

    // Create footer
    const footer = document.createElement('div');
    footer.style.padding = '10px';
    footer.style.marginTop = '20px';
    footer.style.borderTop = this.options.darkMode ? '1px solid #444' : '1px solid #ddd';
    footer.style.textAlign = 'center';
    footer.style.fontSize = '12px';
    footer.style.color = this.options.darkMode ? '#aaa' : '#666';

    const footerText = document.createElement('p');
    footerText.textContent = 'Hospital Simulation Analytics Dashboard';
    footerText.style.margin = '0';

    footer.appendChild(footerText);

    // Add elements to container
    this.container.appendChild(header);
    this.container.appendChild(content);
    this.container.appendChild(footer);

    // Initialize charts
    this.initializeCharts();
  }

  /**
   * Create a section
   * @param {string} title - Section title
   * @param {string} id - Section ID
   * @returns {HTMLElement} - Section element
   */
  createSection(title, id) {
    const section = document.createElement('div');
    section.id = id;
    section.style.flex = '1 1 calc(50% - 20px)';
    section.style.minWidth = '400px';
    section.style.padding = '15px';
    section.style.borderRadius = '8px';
    section.style.backgroundColor = this.options.darkMode ? '#333' : '#f9f9f9';
    section.style.boxShadow = this.options.darkMode ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)';

    const sectionTitle = document.createElement('h2');
    sectionTitle.textContent = title;
    sectionTitle.style.margin = '0 0 15px 0';
    sectionTitle.style.fontSize = '18px';
    sectionTitle.style.borderBottom = this.options.darkMode ? '1px solid #444' : '1px solid #ddd';
    sectionTitle.style.paddingBottom = '8px';

    const sectionContent = document.createElement('div');
    sectionContent.style.height = '300px';
    sectionContent.style.position = 'relative';

    section.appendChild(sectionTitle);
    section.appendChild(sectionContent);

    return section;
  }

  /**
   * Initialize charts
   */
  initializeCharts() {
    // Create chart renderer
    this.chartRenderer = new ChartRenderer({
      darkMode: this.options.darkMode
    });

    // Initialize patient flow chart
    this.initializePatientFlowChart();

    // Initialize wait times chart
    this.initializeWaitTimesChart();

    // Initialize resource utilization chart
    this.initializeResourceUtilizationChart();

    // Initialize patient outcomes chart
    this.initializePatientOutcomesChart();
  }

  /**
   * Initialize patient flow chart
   */
  initializePatientFlowChart() {
    const section = document.getElementById('patient-flow-section');
    if (!section) return;

    const content = section.querySelector('div');
    content.innerHTML = '';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = content.clientWidth;
    canvas.height = content.clientHeight;
    content.appendChild(canvas);

    // Store canvas reference
    this.charts.set('patientFlow', canvas);

    // Initial render
    this.renderPatientFlowChart();
  }

  /**
   * Initialize wait times chart
   */
  initializeWaitTimesChart() {
    const section = document.getElementById('wait-times-section');
    if (!section) return;

    const content = section.querySelector('div');
    content.innerHTML = '';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = content.clientWidth;
    canvas.height = content.clientHeight;
    content.appendChild(canvas);

    // Store canvas reference
    this.charts.set('waitTimes', canvas);

    // Initial render
    this.renderWaitTimesChart();
  }

  /**
   * Initialize resource utilization chart
   */
  initializeResourceUtilizationChart() {
    const section = document.getElementById('resource-utilization-section');
    if (!section) return;

    const content = section.querySelector('div');
    content.innerHTML = '';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = content.clientWidth;
    canvas.height = content.clientHeight;
    content.appendChild(canvas);

    // Store canvas reference
    this.charts.set('resourceUtilization', canvas);

    // Initial render
    this.renderResourceUtilizationChart();
  }

  /**
   * Initialize patient outcomes chart
   */
  initializePatientOutcomesChart() {
    const section = document.getElementById('patient-outcomes-section');
    if (!section) return;

    const content = section.querySelector('div');
    content.innerHTML = '';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = content.clientWidth;
    canvas.height = content.clientHeight;
    content.appendChild(canvas);

    // Store canvas reference
    this.charts.set('patientOutcomes', canvas);

    // Initial render
    this.renderPatientOutcomesChart();
  }

  /**
   * Register event handlers
   */
  registerEventHandlers() {
    if (!this.simulator || !this.simulator.on) {
      console.warn('Simulator does not support event handlers');
      return;
    }

    // Register for simulator events
    this.simulator.on('patientArrival', this.handlePatientArrival.bind(this));
    this.simulator.on('patientDischarge', this.handlePatientDischarge.bind(this));
    this.simulator.on('resourceAllocation', this.handleResourceAllocation.bind(this));
    this.simulator.on('resourceRelease', this.handleResourceRelease.bind(this));
    this.simulator.on('predictionsUpdated', this.handlePredictionsUpdated.bind(this));
    this.simulator.on('simulationStep', this.handleSimulationStep.bind(this));
  }

  /**
   * Handle patient arrival event
   * @param {Object} event - Event data
   */
  handlePatientArrival(event) {
    const { patient, time } = event;

    // Update patient flow data
    this.data.patientFlow.push({
      time,
      patientId: patient.id,
      acuityLevel: patient.acuityLevel
    });

    // Limit data size
    if (this.data.patientFlow.length > 1000) {
      this.data.patientFlow.shift();
    }
  }

  /**
   * Handle patient discharge event
   * @param {Object} event - Event data
   */
  handlePatientDischarge(event) {
    const { patient, time } = event;

    // Update patient outcomes data
    this.data.patientOutcomes.push({
      patientId: patient.id,
      arrivalTime: patient.arrivalTime,
      dischargeTime: time,
      lengthOfStay: (time - patient.arrivalTime) / 60, // in hours
      acuityLevel: patient.acuityLevel,
      waitTime: patient.waitingTimes ? Object.values(patient.waitingTimes).reduce((sum, val) => sum + val, 0) : 0
    });

    // Limit data size
    if (this.data.patientOutcomes.length > 1000) {
      this.data.patientOutcomes.shift();
    }
  }

  /**
   * Handle resource allocation event
   * @param {Object} event - Event data
   */
  handleResourceAllocation(event) {
    const { resource, entity, time } = event;

    // Update resource utilization data
    if (!this.data.resourceUtilization.has(resource.type)) {
      this.data.resourceUtilization.set(resource.type, []);
    }

    const utilizationRate = resource.getUtilizationRate ? resource.getUtilizationRate() : (resource.capacity && resource.available ? (resource.capacity - resource.available) / resource.capacity : 0.5);

    this.data.resourceUtilization.get(resource.type).push({
      time,
      resourceId: resource.id,
      utilizationRate
    });

    // Limit data size
    const utilData = this.data.resourceUtilization.get(resource.type);
    if (utilData.length > 1000) {
      this.data.resourceUtilization.set(resource.type, utilData.slice(-1000));
    }

    // Update wait times data if this is a patient
    if (entity && entity.type === 'patient' && entity.arrivalTime) {
      const waitTime = time - entity.arrivalTime;

      this.data.waitTimes.push({
        time,
        patientId: entity.id,
        waitTime,
        acuityLevel: entity.acuityLevel
      });

      // Limit data size
      if (this.data.waitTimes.length > 1000) {
        this.data.waitTimes.shift();
      }
    }
  }

  /**
   * Handle resource release event
   * @param {Object} event - Event data
   */
  handleResourceRelease(event) {
    const { resource, time } = event;

    // Update resource utilization data
    if (!this.data.resourceUtilization.has(resource.type)) {
      this.data.resourceUtilization.set(resource.type, []);
    }

    const utilizationRate = resource.getUtilizationRate ? resource.getUtilizationRate() : (resource.capacity && resource.available ? (resource.capacity - resource.available) / resource.capacity : 0.5);

    this.data.resourceUtilization.get(resource.type).push({
      time,
      resourceId: resource.id,
      utilizationRate
    });

    // Limit data size
    const utilData = this.data.resourceUtilization.get(resource.type);
    if (utilData.length > 1000) {
      this.data.resourceUtilization.set(resource.type, utilData.slice(-1000));
    }
  }

  /**
   * Handle predictions updated event
   * @param {Object} event - Event data
   */
  handlePredictionsUpdated(event) {
    const { type, predictions } = event;

    if (type === 'patientFlow') {
      this.data.predictions.patientFlow = predictions;
    } else if (type === 'waitTimes') {
      this.data.predictions.waitTimes = predictions;
    } else if (type === 'resourceUtilization') {
      const { resourceType } = event;
      this.data.predictions.resourceUtilization.set(resourceType, predictions);
    } else if (type === 'patientOutcomes') {
      this.data.predictions.patientOutcomes = predictions;
    }
  }

  /**
   * Handle simulation step event
   * @param {Object} event - Event data
   */
  handleSimulationStep(event) {
    // We'll use this to trigger updates at regular intervals
    // For now, we'll just rely on the refresh interval
  }

  /**
   * Start refresh interval
   */
  startRefreshInterval() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }

    this.refreshIntervalId = setInterval(() => {
      this.refreshDashboard();
    }, this.options.refreshInterval);
  }

  /**
   * Stop refresh interval
   */
  stopRefreshInterval() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  /**
   * Refresh dashboard
   */
  refreshDashboard() {
    // Render all charts
    this.renderPatientFlowChart();
    this.renderWaitTimesChart();
    this.renderResourceUtilizationChart();
    this.renderPatientOutcomesChart();
  }

  /**
   * Render patient flow chart
   */
  renderPatientFlowChart() {
    const canvas = this.charts.get('patientFlow');
    if (!canvas) return;

    // Group patient flow data by hour
    const hourlyData = new Map();

    for (const data of this.data.patientFlow) {
      const hour = Math.floor(data.time / 60) % 24;
      const key = hour.toString();

      if (!hourlyData.has(key)) {
        hourlyData.set(key, 0);
      }

      hourlyData.set(key, hourlyData.get(key) + 1);
    }

    // Convert to chart data
    const chartData = {
      labels: Array.from(hourlyData.keys()),
      datasets: [
        {
          label: 'Patient Arrivals',
          data: Array.from(hourlyData.entries()).map(([hour, count]) => ({
            x: parseInt(hour),
            y: count
          })),
          color: '#4285F4'
        }
      ]
    };

    // Add predictions if enabled
    if (this.options.showPredictions && this.data.predictions.patientFlow.length > 0) {
      const predictionData = [];

      // Convert predictions to chart data
      for (let i = 0; i < this.data.predictions.patientFlow.length; i++) {
        const hour = (Math.floor(this.simulator.getCurrentTime() / 60) + i) % 24;
        predictionData.push({
          x: hour,
          y: this.data.predictions.patientFlow[i]
        });
      }

      chartData.datasets.push({
        label: 'Predicted Arrivals',
        data: predictionData,
        color: '#EA4335'
      });
    }

    // Render chart
    this.chartRenderer.renderLineChart(canvas, chartData, {
      xAxisTitle: 'Hour of Day',
      yAxisTitle: 'Number of Arrivals',
      xLabels: ['0', '6', '12', '18', '24'],
      showPoints: true
    });
  }

  /**
   * Render wait times chart
   */
  renderWaitTimesChart() {
    const canvas = this.charts.get('waitTimes');
    if (!canvas) return;

    // Group wait times by acuity level
    const waitTimesByAcuity = new Map();

    for (const data of this.data.waitTimes) {
      const acuity = data.acuityLevel.toString();

      if (!waitTimesByAcuity.has(acuity)) {
        waitTimesByAcuity.set(acuity, []);
      }

      waitTimesByAcuity.get(acuity).push(data.waitTime);
    }

    // Calculate average wait time by acuity
    const averageWaitTimes = new Map();

    for (const [acuity, times] of waitTimesByAcuity.entries()) {
      const sum = times.reduce((acc, time) => acc + time, 0);
      const average = times.length > 0 ? sum / times.length : 0;
      averageWaitTimes.set(acuity, average);
    }

    // Convert to chart data
    const chartData = {
      labels: ['1', '2', '3', '4', '5'],
      datasets: [
        {
          label: 'Average Wait Time',
          data: [1, 2, 3, 4, 5].map(acuity => ({
            x: acuity,
            y: averageWaitTimes.get(acuity.toString()) || 0
          })),
          color: '#34A853'
        }
      ]
    };

    // Add predictions if enabled
    if (this.options.showPredictions && this.data.predictions.waitTimes.length > 0) {
      chartData.datasets.push({
        label: 'Predicted Wait Time',
        data: [1, 2, 3, 4, 5].map(acuity => ({
          x: acuity,
          y: this.data.predictions.waitTimes[acuity - 1] || 0
        })),
        color: '#FBBC05'
      });
    }

    // Render chart
    this.chartRenderer.renderBarChart(canvas, chartData, {
      xAxisTitle: 'Acuity Level',
      yAxisTitle: 'Wait Time (minutes)'
    });
  }

  /**
   * Render resource utilization chart
   */
  renderResourceUtilizationChart() {
    const canvas = this.charts.get('resourceUtilization');
    if (!canvas) return;

    // Prepare datasets
    const datasets = [];
    const resourceTypes = ['ed_beds', 'ward_beds', 'doctors', 'nurses'];
    const resourceLabels = ['ED Beds', 'Ward Beds', 'Doctors', 'Nurses'];
    const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

    // Add actual utilization data
    resourceTypes.forEach((type, index) => {
      if (this.data.resourceUtilization.has(type)) {
        const utilData = this.data.resourceUtilization.get(type);

        // Get the most recent data points (up to 24 hours)
        const recentData = utilData.slice(-24);

        datasets.push({
          label: resourceLabels[index],
          data: recentData.map((data, i) => ({
            x: i,
            y: data.utilizationRate
          })),
          color: colors[index]
        });
      }
    });

    // Add predictions if enabled
    if (this.options.showPredictions) {
      resourceTypes.forEach((type, index) => {
        if (this.data.predictions.resourceUtilization.has(type)) {
          const predictions = this.data.predictions.resourceUtilization.get(type);

          if (predictions && predictions.length > 0) {
            datasets.push({
              label: `Predicted ${resourceLabels[index]}`,
              data: predictions.slice(0, 24).map((value, i) => ({
                x: i,
                y: value
              })),
              color: colors[index] + '80' // Add transparency
            });
          }
        }
      });
    }

    // Convert to chart data
    const chartData = {
      datasets
    };

    // Render chart
    this.chartRenderer.renderLineChart(canvas, chartData, {
      xAxisTitle: 'Time (hours)',
      yAxisTitle: 'Utilization Rate',
      yLabels: ['0%', '25%', '50%', '75%', '100%']
    });
  }

  /**
   * Render patient outcomes chart
   */
  renderPatientOutcomesChart() {
    const canvas = this.charts.get('patientOutcomes');
    if (!canvas) return;

    // Group outcomes by acuity level
    const losData = [0, 0, 0, 0, 0]; // Length of stay by acuity (1-5)
    const countData = [0, 0, 0, 0, 0]; // Count by acuity (1-5)

    for (const data of this.data.patientOutcomes) {
      const acuityIndex = data.acuityLevel - 1;
      if (acuityIndex >= 0 && acuityIndex < 5) {
        losData[acuityIndex] += data.lengthOfStay;
        countData[acuityIndex]++;
      }
    }

    // Calculate average length of stay
    const avgLosData = losData.map((total, index) =>
      countData[index] > 0 ? total / countData[index] : 0
    );

    // Convert to chart data
    const chartData = {
      labels: ['1', '2', '3', '4', '5'],
      datasets: [
        {
          label: 'Average Length of Stay',
          data: [1, 2, 3, 4, 5].map((acuity, index) => ({
            x: acuity,
            y: avgLosData[index]
          })),
          color: '#8AB4F8'
        }
      ]
    };

    // Add predictions if enabled
    if (this.options.showPredictions && this.data.predictions.patientOutcomes.length > 0) {
      chartData.datasets.push({
        label: 'Predicted Length of Stay',
        data: [1, 2, 3, 4, 5].map((acuity, index) => ({
          x: acuity,
          y: this.data.predictions.patientOutcomes[index] || 0
        })),
        color: '#F6AEA9'
      });
    }

    // Render chart
    this.chartRenderer.renderBarChart(canvas, chartData, {
      xAxisTitle: 'Acuity Level',
      yAxisTitle: 'Length of Stay (hours)'
    });
  }

  /**
   * Destroy dashboard
   */
  destroy() {
    // Stop refresh interval
    this.stopRefreshInterval();

    // Remove event handlers
    if (this.simulator && this.simulator.off) {
      this.simulator.off('patientArrival', this.handlePatientArrival);
      this.simulator.off('patientDischarge', this.handlePatientDischarge);
      this.simulator.off('resourceAllocation', this.handleResourceAllocation);
      this.simulator.off('resourceRelease', this.handleResourceRelease);
      this.simulator.off('predictionsUpdated', this.handlePredictionsUpdated);
      this.simulator.off('simulationStep', this.handleSimulationStep);
    }

    // Clear container
    this.container.innerHTML = '';

    // Clear data
    this.data = {
      patientFlow: [],
      waitTimes: [],
      resourceUtilization: new Map(),
      patientOutcomes: [],
      predictions: {
        patientFlow: [],
        waitTimes: [],
        resourceUtilization: new Map(),
        patientOutcomes: []
      }
    };

    this.initialized = false;
  }
}

// Export the class
export default AnalyticsDashboard;
