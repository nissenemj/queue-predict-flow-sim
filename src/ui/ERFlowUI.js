import ERFlowSimulator from '../simulators/ERFlowSimulator.js';

/**
 * UI Controller for ER Flow Simulator
 * Handles UI interactions and visualization for the ER Flow Simulator
 */
class ERFlowUI {
  /**
   * Constructor for the ER Flow UI Controller
   */
  constructor() {
    this.simulator = new ERFlowSimulator();
    this.savedSimulations = [];
    this.simulationColors = [
      '#2a6ebb', '#4caf50', '#e74c3c', '#8e44ad',
      '#e67e22', '#f1c40f', '#1abc9c', '#95a5a6'
    ];
    this.charts = {
      occupancy: null,
      waitTime: null,
      kpiComparison: null,
      occupancyComparison: null,
      waitTimeComparison: null
    };
    this.latestResults = null;
  }

  /**
   * Initialize the UI
   */
  initialize() {
    this.setupEventListeners();
    this.setupTabSwitching();
  }

  /**
   * Set up event listeners for UI elements
   */
  setupEventListeners() {
    // Run simulation button
    const runButton = document.getElementById('run-simulation');
    if (runButton) {
      runButton.addEventListener('click', () => this.runSimulation());
    }

    // Save for comparison button
    const saveButton = document.getElementById('save-for-comparison');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveForComparison());
    }

    // Go to parameters button
    const goToParamsButton = document.getElementById('go-to-parameters');
    if (goToParamsButton) {
      goToParamsButton.addEventListener('click', () => {
        const tabs = document.querySelectorAll('#er-flow .tab');
        if (tabs.length > 0) {
          tabs[0].click();
        }
      });
    }

    // Scenario select
    const scenarioSelect = document.getElementById('scenario');
    if (scenarioSelect) {
      scenarioSelect.addEventListener('change', () => this.updateFromScenario());
    }
  }

  /**
   * Set up tab switching functionality
   */
  setupTabSwitching() {
    const tabs = document.querySelectorAll('#er-flow .tab');
    const tabContents = document.querySelectorAll('#er-flow .tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');

        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tabId).classList.add('active');
      });
    });
  }

  /**
   * Run the simulation
   */
  async runSimulation() {
    const runButton = document.getElementById('run-simulation');
    runButton.textContent = 'Simuloidaan...';
    runButton.disabled = true;

    try {
      const params = this.getCurrentParams();
      
      // Initialize and run the simulation
      this.simulator.initialize(params);
      
      // Simulate a delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Run the simulation
      const results = this.simulator.run(params.duration_days * 24 * 60); // Convert days to minutes
      
      // Store the results
      this.latestResults = results;
      
      // Update the UI with results
      this.updateResultsUI(results);
      
      // Switch to results tab
      const tabs = document.querySelectorAll('#er-flow .tab');
      if (tabs.length > 1) {
        tabs[1].click();
      }
    } catch (error) {
      console.error('Error running simulation:', error);
      alert('Virhe simulaation suorittamisessa. Tarkista parametrit ja yritä uudelleen.');
    } finally {
      runButton.textContent = 'Suorita simulaatio';
      runButton.disabled = false;
    }
  }

  /**
   * Get current parameters from UI
   * @returns {Object} - Parameters object
   */
  getCurrentParams() {
    return {
      arrival_rates: {
        morning: parseFloat(document.getElementById('morning-rate').value),
        afternoon: parseFloat(document.getElementById('afternoon-rate').value),
        evening: parseFloat(document.getElementById('evening-rate').value),
        night: parseFloat(document.getElementById('night-rate').value)
      },
      staff: {
        doctors: {
          day: parseInt(document.getElementById('doctors-day').value),
          evening: parseInt(document.getElementById('doctors-evening').value),
          night: parseInt(document.getElementById('doctors-night').value)
        },
        nurses: {
          day: parseInt(document.getElementById('nurses-day').value),
          evening: parseInt(document.getElementById('nurses-evening').value),
          night: parseInt(document.getElementById('nurses-night').value)
        }
      },
      ed_beds_capacity: parseInt(document.getElementById('ed-beds').value),
      ward_beds_capacity: parseInt(document.getElementById('ward-beds').value),
      duration_days: parseInt(document.getElementById('duration').value),
      scenario: document.getElementById('scenario').value
    };
  }

  /**
   * Update UI based on selected scenario
   */
  updateFromScenario() {
    const scenario = document.getElementById('scenario').value;

    if (scenario === 'baseline') {
      document.getElementById('morning-rate').value = 8;
      document.getElementById('afternoon-rate').value = 7;
      document.getElementById('evening-rate').value = 5;
      document.getElementById('night-rate').value = 3;
      document.getElementById('doctors-day').value = 6;
      document.getElementById('doctors-evening').value = 4;
      document.getElementById('doctors-night').value = 2;
      document.getElementById('nurses-day').value = 12;
      document.getElementById('nurses-evening').value = 10;
      document.getElementById('nurses-night').value = 6;
      document.getElementById('ed-beds').value = 50;
      document.getElementById('ward-beds').value = 300;
    } else if (scenario === 'staff-plus') {
      document.getElementById('morning-rate').value = 8;
      document.getElementById('afternoon-rate').value = 7;
      document.getElementById('evening-rate').value = 5;
      document.getElementById('night-rate').value = 3;
      document.getElementById('doctors-day').value = 8;
      document.getElementById('doctors-evening').value = 5;
      document.getElementById('doctors-night').value = 3;
      document.getElementById('nurses-day').value = 15;
      document.getElementById('nurses-evening').value = 12;
      document.getElementById('nurses-night').value = 8;
      document.getElementById('ed-beds').value = 50;
      document.getElementById('ward-beds').value = 300;
    } else if (scenario === 'staff-minus') {
      document.getElementById('morning-rate').value = 8;
      document.getElementById('afternoon-rate').value = 7;
      document.getElementById('evening-rate').value = 5;
      document.getElementById('night-rate').value = 3;
      document.getElementById('doctors-day').value = 5;
      document.getElementById('doctors-evening').value = 3;
      document.getElementById('doctors-night').value = 1;
      document.getElementById('nurses-day').value = 10;
      document.getElementById('nurses-evening').value = 8;
      document.getElementById('nurses-night').value = 4;
      document.getElementById('ed-beds').value = 50;
      document.getElementById('ward-beds').value = 300;
    } else if (scenario === 'beds-plus') {
      document.getElementById('morning-rate').value = 8;
      document.getElementById('afternoon-rate').value = 7;
      document.getElementById('evening-rate').value = 5;
      document.getElementById('night-rate').value = 3;
      document.getElementById('doctors-day').value = 6;
      document.getElementById('doctors-evening').value = 4;
      document.getElementById('doctors-night').value = 2;
      document.getElementById('nurses-day').value = 12;
      document.getElementById('nurses-evening').value = 10;
      document.getElementById('nurses-night').value = 6;
      document.getElementById('ed-beds').value = 60;
      document.getElementById('ward-beds').value = 360;
    } else if (scenario === 'high-load') {
      document.getElementById('morning-rate').value = 12;
      document.getElementById('afternoon-rate').value = 10;
      document.getElementById('evening-rate').value = 8;
      document.getElementById('night-rate').value = 5;
      document.getElementById('doctors-day').value = 6;
      document.getElementById('doctors-evening').value = 4;
      document.getElementById('doctors-night').value = 2;
      document.getElementById('nurses-day').value = 12;
      document.getElementById('nurses-evening').value = 10;
      document.getElementById('nurses-night').value = 6;
      document.getElementById('ed-beds').value = 50;
      document.getElementById('ward-beds').value = 300;
    }
  }

  /**
   * Update the results UI with simulation results
   * @param {Object} results - Simulation results
   */
  updateResultsUI(results) {
    // Update KPI values
    document.getElementById('avg-wait').textContent = results.avg_wait.toFixed(1);
    document.getElementById('avg-los').textContent = results.avg_los.toFixed(1);
    document.getElementById('ed-occupancy').textContent = results.ed_occupancy.toFixed(1);
    document.getElementById('ward-occupancy').textContent = results.ward_occupancy.toFixed(1);

    // Show results content
    document.getElementById('results-content').style.display = 'block';
    document.getElementById('no-results').style.display = 'none';

    // Update charts
    this.updateCharts(results);
  }

  /**
   * Update charts with new data
   * @param {Object} results - Simulation results
   */
  updateCharts(results) {
    const ctx1 = document.getElementById('occupancy-chart').getContext('2d');
    const ctx2 = document.getElementById('wait-time-chart').getContext('2d');

    const labels = results.times.map(hour => {
      const day = Math.floor(hour / 24) + 1;
      const hourOfDay = hour % 24;
      return `Päivä ${day}, ${hourOfDay}:00`;
    });

    if (this.charts.occupancy) this.charts.occupancy.destroy();
    if (this.charts.waitTime) this.charts.waitTime.destroy();

    this.charts.occupancy = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Päivystyksen vuodepaikat käytössä',
            data: results.ed_occ_data,
            borderColor: '#2a6ebb',
            backgroundColor: 'rgba(42, 110, 187, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Osastojen vuodepaikat käytössä',
            data: results.ward_occ_data,
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Vuodepaikkojen käyttö ajan funktiona',
            font: {
              size: 16
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 10
            },
            title: {
              display: true,
              text: 'Aika'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Vuodepaikat käytössä'
            }
          }
        }
      }
    });

    this.charts.waitTime = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Odotusaika',
            data: results.wait_times,
            borderColor: '#f44336',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Odotusajat ajan funktiona',
            font: {
              size: 16
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 10
            },
            title: {
              display: true,
              text: 'Aika'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Odotusaika (minuuttia)'
            }
          }
        }
      }
    });
  }

  /**
   * Save current simulation for comparison
   */
  saveForComparison() {
    if (!this.latestResults) {
      alert('Suorita ensin simulaatio ennen tallentamista vertailuun!');
      return;
    }

    const currentParams = this.getCurrentParams();
    const name = this.createSimulationName(currentParams);
    const colorIndex = this.savedSimulations.length % this.simulationColors.length;
    const color = this.simulationColors[colorIndex];

    this.savedSimulations.push({
      name: name,
      color: color,
      params: currentParams,
      results: this.latestResults,
      visible: true
    });

    this.updateComparisonView();

    const saveFeedback = document.getElementById('save-feedback');
    saveFeedback.style.display = 'inline';
    setTimeout(() => {
      saveFeedback.style.display = 'none';
    }, 2000);
  }

  /**
   * Create a name for the simulation
   * @param {Object} params - Simulation parameters
   * @returns {string} - Simulation name
   */
  createSimulationName(params) {
    let name;
    if (params.scenario === 'custom') {
      const totalDoctors = params.staff.doctors.day +
        params.staff.doctors.evening +
        params.staff.doctors.night;
      const totalNurses = params.staff.nurses.day +
        params.staff.nurses.evening +
        params.staff.nurses.night;
      name = `L:${totalDoctors}/H:${totalNurses}/Vuoteet:${params.ed_beds_capacity}`;
    } else {
      const scenarioNames = {
        'baseline': 'Perusskenaario',
        'staff-plus': 'Henkilöstö +20%',
        'staff-minus': 'Henkilöstö -20%',
        'beds-plus': 'Vuodepaikat +20%',
        'high-load': 'Korkea kuormitus'
      };
      name = scenarioNames[params.scenario] || `Simulaatio ${this.savedSimulations.length + 1}`;
    }

    let nameCount = 1;
    let uniqueName = name;
    while (this.savedSimulations.some(sim => sim.name === uniqueName)) {
      nameCount++;
      uniqueName = `${name} (${nameCount})`;
    }
    return uniqueName;
  }

  /**
   * Update the comparison view
   */
  updateComparisonView() {
    const container = document.getElementById('saved-simulations-container');
    const noComparisonDiv = document.getElementById('no-comparison-data');
    const comparisonContentDiv = document.getElementById('comparison-content');

    if (this.savedSimulations.length === 0) {
      noComparisonDiv.style.display = 'block';
      comparisonContentDiv.style.display = 'none';
      return;
    } else {
      noComparisonDiv.style.display = 'none';
      comparisonContentDiv.style.display = 'block';
    }

    container.innerHTML = '';

    this.savedSimulations.forEach((sim, index) => {
      const simDiv = document.createElement('div');
      simDiv.className = 'simulation-item';

      const colorBox = document.createElement('div');
      colorBox.className = 'simulation-color';
      colorBox.style.backgroundColor = sim.color;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = sim.name;

      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'simulation-controls';

      const visibilityBtn = document.createElement('button');
      visibilityBtn.textContent = sim.visible ? 'Piilota' : 'Näytä';
      visibilityBtn.style.backgroundColor = sim.visible ? '#95a5a6' : '#2a6ebb';

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Poista';
      removeBtn.style.backgroundColor = '#f44336';

      visibilityBtn.addEventListener('click', () => {
        this.savedSimulations[index].visible = !this.savedSimulations[index].visible;
        this.updateComparisonView();
        this.updateComparisonCharts();
      });

      removeBtn.addEventListener('click', () => {
        this.savedSimulations.splice(index, 1);
        this.updateComparisonView();
        this.updateComparisonCharts();
      });

      controlsDiv.appendChild(visibilityBtn);
      controlsDiv.appendChild(removeBtn);

      simDiv.appendChild(colorBox);
      simDiv.appendChild(nameSpan);
      simDiv.appendChild(controlsDiv);

      container.appendChild(simDiv);
    });

    this.updateComparisonCharts();
  }

  /**
   * Update comparison charts
   */
  updateComparisonCharts() {
    if (this.savedSimulations.length === 0) return;

    const visibleSimulations = this.savedSimulations.filter(sim => sim.visible);

    if (visibleSimulations.length === 0) return;

    this.updateKpiComparisonChart(visibleSimulations);
    this.updateOccupancyComparisonChart(visibleSimulations);
    this.updateWaitTimeComparisonChart(visibleSimulations);
  }

  /**
   * Update KPI comparison chart
   * @param {Array} visibleSimulations - Visible simulations
   */
  updateKpiComparisonChart(visibleSimulations) {
    const ctx = document.getElementById('kpi-comparison-chart').getContext('2d');

    if (this.charts.kpiComparison) {
      this.charts.kpiComparison.destroy();
    }

    const labels = ['Keskm. odotusaika (min)', 'Keskm. hoitoaika (päivää)', 'Päivystyksen käyttöaste (%)', 'Osastojen käyttöaste (%)'];

    const datasets = visibleSimulations.map(sim => ({
      label: sim.name,
      data: [
        sim.results.avg_wait,
        sim.results.avg_los,
        sim.results.ed_occupancy,
        sim.results.ward_occupancy
      ],
      backgroundColor: sim.color,
      borderColor: sim.color,
      borderWidth: 1
    }));

    this.charts.kpiComparison = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'KPI-vertailu simulaatioiden välillä'
          }
        }
      }
    });
  }

  /**
   * Update occupancy comparison chart
   * @param {Array} visibleSimulations - Visible simulations
   */
  updateOccupancyComparisonChart(visibleSimulations) {
    // Implementation similar to updateKpiComparisonChart
    // ...
  }

  /**
   * Update wait time comparison chart
   * @param {Array} visibleSimulations - Visible simulations
   */
  updateWaitTimeComparisonChart(visibleSimulations) {
    // Implementation similar to updateKpiComparisonChart
    // ...
  }
}

// Export the ERFlowUI class
export default ERFlowUI;
