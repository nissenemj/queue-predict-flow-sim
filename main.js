// Main JavaScript for combined simulator

document.addEventListener('DOMContentLoaded', function() {
  // Main tab switching
  const mainTabs = document.querySelectorAll('.main-tab');
  const mainTabContents = document.querySelectorAll('.main-tab-content');

  mainTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-main-tab');

      mainTabs.forEach(t => t.classList.remove('active'));
      mainTabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Chart setup for ER Flow
  let occupancyChart = null;
  let waitTimeChart = null;
  let kpiComparisonChart = null;
  let occupancyComparisonChart = null;
  let waitTimeComparisonChart = null;

  // Function to update charts with new data
  function updateCharts(results) {
    const ctx1 = document.getElementById('occupancy-chart').getContext('2d');
    const ctx2 = document.getElementById('wait-time-chart').getContext('2d');

    const labels = results.times.map(hour => {
      const day = Math.floor(hour / 24) + 1;
      const hourOfDay = hour % 24;
      return `Päivä ${day}, ${hourOfDay}:00`;
    });

    if (occupancyChart) occupancyChart.destroy();
    if (waitTimeChart) waitTimeChart.destroy();

    occupancyChart = new Chart(ctx1, {
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

    waitTimeChart = new Chart(ctx2, {
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

  // Luo simulaation nimi
  function createSimulationName(params) {
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
      name = scenarioNames[params.scenario] || `Simulaatio ${window.erFlowSimulator.savedSimulations.length + 1}`;
    }

    let nameCount = 1;
    let uniqueName = name;
    while (window.erFlowSimulator.savedSimulations.some(sim => sim.name === uniqueName)) {
      nameCount++;
      uniqueName = `${name} (${nameCount})`;
    }
    return uniqueName;
  }

  // Simulaation tallentaminen vertailuun
  function saveSimulationForComparison(simulationResults) {
    const currentParams = window.erFlowSimulator.getCurrentParams();
    const name = createSimulationName(currentParams);
    const colorIndex = window.erFlowSimulator.savedSimulations.length % window.erFlowSimulator.simulationColors.length;
    const color = window.erFlowSimulator.simulationColors[colorIndex];

    window.erFlowSimulator.savedSimulations.push({
      name: name,
      color: color,
      params: currentParams,
      results: simulationResults,
      visible: true
    });

    updateComparisonView();

    const saveFeedback = document.getElementById('save-feedback');
    saveFeedback.style.display = 'inline';
    setTimeout(() => {
      saveFeedback.style.display = 'none';
    }, 2000);
  }

  // Päivittää vertailunäkymän
  function updateComparisonView() {
    const container = document.getElementById('saved-simulations-container');
    const noComparisonDiv = document.getElementById('no-comparison-data');
    const comparisonContentDiv = document.getElementById('comparison-content');

    if (window.erFlowSimulator.savedSimulations.length === 0) {
      noComparisonDiv.style.display = 'block';
      comparisonContentDiv.style.display = 'none';
      return;
    } else {
      noComparisonDiv.style.display = 'none';
      comparisonContentDiv.style.display = 'block';
    }

    container.innerHTML = '';

    window.erFlowSimulator.savedSimulations.forEach((sim, index) => {
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
        window.erFlowSimulator.savedSimulations[index].visible = !window.erFlowSimulator.savedSimulations[index].visible;
        updateComparisonView();
        updateComparisonCharts();
      });

      removeBtn.addEventListener('click', () => {
        window.erFlowSimulator.savedSimulations.splice(index, 1);
        updateComparisonView();
        updateComparisonCharts();
      });

      controlsDiv.appendChild(visibilityBtn);
      controlsDiv.appendChild(removeBtn);

      simDiv.appendChild(colorBox);
      simDiv.appendChild(nameSpan);
      simDiv.appendChild(controlsDiv);

      container.appendChild(simDiv);
    });

    updateComparisonCharts();
  }

  // Päivittää vertailukaaviot
  function updateComparisonCharts() {
    if (window.erFlowSimulator.savedSimulations.length === 0) return;

    const visibleSimulations = window.erFlowSimulator.savedSimulations.filter(sim => sim.visible);

    if (visibleSimulations.length === 0) return;

    updateKpiComparisonChart(visibleSimulations);
    updateOccupancyComparisonChart(visibleSimulations);
    updateWaitTimeComparisonChart(visibleSimulations);
  }

  // KPI-vertailukaavion päivitys
  function updateKpiComparisonChart(visibleSimulations) {
    const ctx = document.getElementById('kpi-comparison-chart').getContext('2d');

    if (kpiComparisonChart) {
      kpiComparisonChart.destroy();
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

    kpiComparisonChart = new Chart(ctx, {
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

  // Vuodepaikkojen käytön vertailukaavion päivitys
  function updateOccupancyComparisonChart(visibleSimulations) {
    const ctx = document.getElementById('occupancy-comparison-chart').getContext('2d');

    if (occupancyComparisonChart) {
      occupancyComparisonChart.destroy();
    }

    const latestSim = visibleSimulations[visibleSimulations.length - 1];
    const timeLabels = latestSim.results.times.map(hour => {
      const day = Math.floor(hour / 24) + 1;
      const hourOfDay = hour % 24;
      return `Päivä ${day}, ${hourOfDay}:00`;
    });

    const maxHours = 7 * 24;
    const visibleTimeLabels = timeLabels.slice(0, maxHours);

    const datasets = [];

    visibleSimulations.forEach(sim => {
      if (sim.results.ed_occ_data) {
        datasets.push({
          label: `${sim.name} - Päivystys`,
          data: sim.results.ed_occ_data.slice(0, maxHours),
          borderColor: sim.color,
          backgroundColor: 'transparent',
          borderDash: [],
          tension: 0.4
        });
      }

      if (sim.results.ward_occ_data) {
        datasets.push({
          label: `${sim.name} - Osastot`,
          data: sim.results.ward_occ_data.slice(0, maxHours),
          borderColor: sim.color,
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4
        });
      }
    });

    occupancyComparisonChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: visibleTimeLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Vuodepaikat käytössä'
            }
          },
          x: {
            ticks: {
              maxTicksLimit: 14
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Vuodepaikkojen käyttö (ensimmäiset 7 päivää)'
          }
        }
      }
    });
  }

  // Odotusaikojen vertailukaavion päivitys
  function updateWaitTimeComparisonChart(visibleSimulations) {
    const ctx = document.getElementById('wait-time-comparison-chart').getContext('2d');

    if (waitTimeComparisonChart) {
      waitTimeComparisonChart.destroy();
    }

    const latestSim = visibleSimulations[visibleSimulations.length - 1];
    const timeLabels = latestSim.results.times.map(hour => {
      const day = Math.floor(hour / 24) + 1;
      const hourOfDay = hour % 24;
      return `Päivä ${day}, ${hourOfDay}:00`;
    });

    const maxHours = 7 * 24;
    const visibleTimeLabels = timeLabels.slice(0, maxHours);

    const datasets = visibleSimulations.map(sim => ({
      label: sim.name,
      data: sim.results.wait_times ? sim.results.wait_times.slice(0, maxHours) : [],
      borderColor: sim.color,
      backgroundColor: `${sim.color}20`,
      fill: true,
      tension: 0.4
    }));

    waitTimeComparisonChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: visibleTimeLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Odotusaika (minuuttia)'
            }
          },
          x: {
            ticks: {
              maxTicksLimit: 14
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Odotusajat (ensimmäiset 7 päivää)'
          }
        }
      }
    });
  }

  // Run simulation button
  document.getElementById('run-simulation').addEventListener('click', async () => {
    const runButton = document.getElementById('run-simulation');
    runButton.textContent = 'Simuloidaan...';
    runButton.disabled = true;

    try {
      const params = window.erFlowSimulator.getCurrentParams();

      await new Promise(resolve => setTimeout(resolve, 1500));

      const results = window.erFlowSimulator.generateDemoResults(params);

      window.latestResults = results;

      document.getElementById('avg-wait').textContent = results.avg_wait.toFixed(1);
      document.getElementById('avg-los').textContent = results.avg_los.toFixed(1);
      document.getElementById('ed-occupancy').textContent = results.ed_occupancy.toFixed(1);
      document.getElementById('ward-occupancy').textContent = results.ward_occupancy.toFixed(1);

      document.getElementById('results-content').style.display = 'block';
      document.getElementById('no-results').style.display = 'none';

      updateCharts(results);

      // Switch to results tab
      document.querySelectorAll('#er-flow .tab')[1].click();

    } catch (error) {
      console.error('Error running simulation:', error);
      alert('Virhe simulaation suorittamisessa. Tarkista parametrit ja yritä uudelleen.');
    } finally {
      runButton.textContent = 'Suorita simulaatio';
      runButton.disabled = false;
    }
  });

  // Kiinnitä tallennuspainike
  document.getElementById('save-for-comparison').addEventListener('click', function () {
    if (!window.latestResults) {
      alert('Suorita ensin simulaatio ennen tallentamista vertailuun!');
      return;
    }

    saveSimulationForComparison(window.latestResults);
  });
});
