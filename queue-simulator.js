// Queue Simulator JavaScript

function generateQueueSimulationResults(params) {
  const weeks = params.simulationDurationWeeks;
  const baselineQueue = [params.initialQueueSize];
  const interventionQueue = [params.initialQueueSize];
  const baselineSurgeries = [];
  const interventionSurgeries = [];

  // Generate queue lengths for each week
  for (let i = 1; i < weeks; i++) {
    // Baseline: new arrivals minus surgeries performed
    const baselineSurgeriesPossible = Math.min(baselineQueue[i-1], params.slotsPerWeek);
    baselineSurgeries.push(baselineSurgeriesPossible);
    const baselineNewQueue = baselineQueue[i-1] + params.avgArrivalsPerWeek - baselineSurgeriesPossible;
    baselineQueue.push(Math.max(0, baselineNewQueue));

    // Intervention: new arrivals minus surgeries performed with increased capacity
    const interventionSurgeriesPossible = Math.min(interventionQueue[i-1], params.interventionSlots);
    interventionSurgeries.push(interventionSurgeriesPossible);
    const interventionNewQueue = interventionQueue[i-1] + params.avgArrivalsPerWeek - interventionSurgeriesPossible;
    interventionQueue.push(Math.max(0, interventionNewQueue));
  }

  // Add the last week's surgeries
  const lastBaselineSurgeries = Math.min(baselineQueue[weeks-1], params.slotsPerWeek);
  const lastInterventionSurgeries = Math.min(interventionQueue[weeks-1], params.interventionSlots);
  baselineSurgeries.push(lastBaselineSurgeries);
  interventionSurgeries.push(lastInterventionSurgeries);

  // Calculate average wait time (simplified for mock data)
  let baselineWaitTime = params.initialQueueSize > 0 ? 
    params.initialQueueSize / (params.slotsPerWeek / 7) : 0;
  
  if (params.avgArrivalsPerWeek > params.slotsPerWeek) {
    baselineWaitTime *= 1.5; // Queue is growing, so wait times increase
  }

  let interventionWaitTime = params.initialQueueSize > 0 ? 
    params.initialQueueSize / (params.interventionSlots / 7) : 0;
  
  if (params.avgArrivalsPerWeek > params.interventionSlots) {
    interventionWaitTime *= 1.5; // Queue is growing, so wait times increase
  }

  // Calculate total surgeries
  const totalBaselineSurgeries = baselineSurgeries.reduce((a, b) => a + b, 0);
  const totalInterventionSurgeries = interventionSurgeries.reduce((a, b) => a + b, 0);

  return {
    baselineResults: {
      avgWaitTime: Math.min(baselineWaitTime, params.simulationDurationWeeks * 7), // Cap at simulation duration
      finalQueueLength: baselineQueue[baselineQueue.length - 1],
      totalSurgeries: totalBaselineSurgeries,
      weeklyQueueLengths: baselineQueue,
      weeklySurgeries: baselineSurgeries
    },
    interventionResults: {
      avgWaitTime: Math.min(interventionWaitTime, params.simulationDurationWeeks * 7), // Cap at simulation duration
      finalQueueLength: interventionQueue[interventionQueue.length - 1],
      totalSurgeries: totalInterventionSurgeries,
      weeklyQueueLengths: interventionQueue,
      weeklySurgeries: interventionSurgeries
    }
  };
}

// Initialize Queue Simulator
document.addEventListener('DOMContentLoaded', function() {
  // Chart for queue simulator
  let queueChart = null;
  let activeQueueChartType = 'queue';
  
  // Get DOM elements
  const queueArrivalsInput = document.getElementById('queue-arrivals');
  const queueSlotsInput = document.getElementById('queue-slots');
  const queueInitialInput = document.getElementById('queue-initial');
  const queueDurationInput = document.getElementById('queue-duration');
  const queueAddedSlotsInput = document.getElementById('queue-added-slots');
  const queueInterventionSlotsInput = document.getElementById('queue-intervention-slots');
  const totalSlotsSpan = document.getElementById('total-slots');
  const slotsChangeSpan = document.getElementById('slots-change');
  const durationMonthsSpan = document.getElementById('duration-months');
  
  const addedSlotsGroup = document.getElementById('added-slots-group');
  const interventionSlotsGroup = document.getElementById('intervention-slots-group');
  
  const interventionTypeRadios = document.querySelectorAll('input[name="intervention-type"]');
  
  // Handle intervention type change
  interventionTypeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      const interventionType = this.value;
      
      if (interventionType === 'add') {
        addedSlotsGroup.style.display = 'block';
        interventionSlotsGroup.style.display = 'none';
        
        // Update total slots
        const slotsPerWeek = parseInt(queueSlotsInput.value);
        const addedSlots = parseInt(queueAddedSlotsInput.value);
        totalSlotsSpan.textContent = slotsPerWeek + addedSlots;
        
        // Update intervention slots input
        queueInterventionSlotsInput.value = slotsPerWeek + addedSlots;
      } else {
        addedSlotsGroup.style.display = 'none';
        interventionSlotsGroup.style.display = 'block';
        
        // Update slots change
        const slotsPerWeek = parseInt(queueSlotsInput.value);
        const interventionSlots = parseInt(queueInterventionSlotsInput.value);
        const change = interventionSlots - slotsPerWeek;
        slotsChangeSpan.textContent = change > 0 ? `+${change}` : change;
        
        // Update added slots input
        queueAddedSlotsInput.value = Math.max(0, change);
      }
    });
  });
  
  // Update total slots when slots or added slots change
  queueSlotsInput.addEventListener('input', function() {
    const slotsPerWeek = parseInt(this.value);
    
    if (document.querySelector('input[name="intervention-type"]:checked').value === 'add') {
      const addedSlots = parseInt(queueAddedSlotsInput.value);
      totalSlotsSpan.textContent = slotsPerWeek + addedSlots;
      queueInterventionSlotsInput.value = slotsPerWeek + addedSlots;
    } else {
      const interventionSlots = parseInt(queueInterventionSlotsInput.value);
      const change = interventionSlots - slotsPerWeek;
      slotsChangeSpan.textContent = change > 0 ? `+${change}` : change;
    }
  });
  
  queueAddedSlotsInput.addEventListener('input', function() {
    const slotsPerWeek = parseInt(queueSlotsInput.value);
    const addedSlots = parseInt(this.value);
    totalSlotsSpan.textContent = slotsPerWeek + addedSlots;
    queueInterventionSlotsInput.value = slotsPerWeek + addedSlots;
  });
  
  queueInterventionSlotsInput.addEventListener('input', function() {
    const slotsPerWeek = parseInt(queueSlotsInput.value);
    const interventionSlots = parseInt(this.value);
    const change = interventionSlots - slotsPerWeek;
    slotsChangeSpan.textContent = change > 0 ? `+${change}` : change;
    queueAddedSlotsInput.value = Math.max(0, change);
  });
  
  // Update duration months when weeks change
  queueDurationInput.addEventListener('input', function() {
    const weeks = parseInt(this.value);
    const months = Math.round(weeks / 4);
    durationMonthsSpan.textContent = months;
  });
  
  // Chart tab switching
  const chartTabs = document.querySelectorAll('.queue-simulator-chart-tab');
  chartTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      chartTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      activeQueueChartType = this.getAttribute('data-chart');
      updateQueueChart(window.queueSimulationResults);
    });
  });
  
  // Run queue simulation
  document.getElementById('run-queue-simulation').addEventListener('click', function() {
    const params = {
      avgArrivalsPerWeek: parseInt(queueArrivalsInput.value),
      slotsPerWeek: parseInt(queueSlotsInput.value),
      initialQueueSize: parseInt(queueInitialInput.value),
      interventionSlots: parseInt(queueInterventionSlotsInput.value),
      simulationDurationWeeks: parseInt(queueDurationInput.value)
    };
    
    const results = generateQueueSimulationResults(params);
    window.queueSimulationResults = results;
    
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
    
    updateQueueChart(results);
  });
  
  function updateQueueChart(results) {
    if (!results) return;
    
    const ctx = document.getElementById('queue-chart').getContext('2d');
    
    if (queueChart) {
      queueChart.destroy();
    }
    
    const weeks = Array.from({length: results.baselineResults.weeklyQueueLengths.length}, (_, i) => i + 1);
    
    let chartData, chartOptions;
    
    if (activeQueueChartType === 'queue') {
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
    } else if (activeQueueChartType === 'surgeries') {
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
    } else if (activeQueueChartType === 'cumulative') {
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
    
    queueChart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: chartOptions
    });
  }
  
  // Expose to window for access from other scripts
  window.queueSimulator = {
    generateQueueSimulationResults,
    updateQueueChart
  };
});
