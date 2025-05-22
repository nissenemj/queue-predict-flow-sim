// ER Flow Simulator JavaScript

function generateDemoResults(params) {
  // Alustus
  let results = {
    avg_wait: 0,
    avg_los: 0,
    ed_occupancy: 0,
    ward_occupancy: 0,
    max_ed_occupancy: 0,
    max_ward_occupancy: 0,
    times: [],
    ed_occ_data: [],
    ward_occ_data: [],
    wait_times: []
  };

  // Kuormituskerroin saapumistiheyksien perusteella
  const totalArrivalRate = Object.values(params.arrival_rates).reduce((a, b) => a + b, 0);
  const baselineTotal = 23; // 8+7+5+3 oletusskenaarion summa
  const loadFactor = totalArrivalRate / baselineTotal;

  // Laske henkilöstömäärät työvuoroittain
  const avgDoctors = (params.staff.doctors.day * 8 +
    params.staff.doctors.evening * 8 +
    params.staff.doctors.night * 8) / 24;

  const avgNurses = (params.staff.nurses.day * 8 +
    params.staff.nurses.evening * 8 +
    params.staff.nurses.night * 8) / 24;

  // Henkilöstömäärän vaikutus resursseihin
  const staffFactor = (avgDoctors / 4 + avgNurses / 9) / 2;

  // Keskimääräinen odotusaika päivystyksessä
  results.avg_wait = 25 * loadFactor / staffFactor;
  results.avg_wait = Math.max(5, Math.min(150, results.avg_wait));

  // Keskimääräinen hoitoaika osastolla päivinä
  results.avg_los = 3 + (loadFactor - 1) * 0.5;
  results.avg_los = Math.max(1.5, Math.min(7, results.avg_los));

  // Vuodepaikkojen käyttöaste
  results.ed_occupancy = 70 * loadFactor / (Math.sqrt(staffFactor) * (params.ed_beds_capacity / 50));
  results.ward_occupancy = 80 * Math.pow(loadFactor, 0.7) / (params.ward_beds_capacity / 300);

  // Käyttöasteiden rajaus järkeviin rajoihin
  results.ed_occupancy = Math.max(20, Math.min(99, results.ed_occupancy));
  results.ward_occupancy = Math.max(40, Math.min(98, results.ward_occupancy));

  // Maksimikäyttöasteet
  results.max_ed_occupancy = Math.min(100, results.ed_occupancy * 1.2);
  results.max_ward_occupancy = Math.min(100, results.ward_occupancy * 1.15);

  // Luo aikasarjadata simulaatiosta
  const hours = params.duration_days * 24;

  // Aikasarjajen generointi
  const times = [];
  const edOccData = [];
  const wardOccData = [];
  const waitTimes = [];

  // Keskimääräiset käytössä olevat vuodepaikat
  const avgEdOcc = params.ed_beds_capacity * results.ed_occupancy / 100;
  const avgWardOcc = params.ward_beds_capacity * results.ward_occupancy / 100;

  // Päivystyksen vuodepaikkojen käytön vaihtelu vuorokauden mittaan
  const edHourlyPattern = [
    0.5, 0.4, 0.3, 0.25, 0.2, 0.3, 0.4, 0.6, 0.8, 1.0, 1.2, 1.3,
    1.4, 1.5, 1.5, 1.6, 1.7, 1.8, 1.7, 1.6, 1.4, 1.2, 1.0, 0.7
  ];

  // Viikonpäivien vaikutus
  const dayOfWeekPattern = [1.0, 0.95, 1.0, 1.05, 1.1, 1.3, 1.2];
  const wardDayOfWeekPattern = [1.05, 1.02, 1.0, 0.98, 0.95, 0.9, 0.92];

  // Trendi pitkällä aikavälillä
  const trendDirection = Math.random() > 0.5 ? 1 : -1;
  const trendStrength = Math.random() * 0.003;

  // Generoi tunnittainen data
  for (let i = 0; i < hours; i++) {
    times.push(i);

    const hourOfDay = i % 24;
    const dayOfSim = Math.floor(i / 24);
    const dayOfWeek = dayOfSim % 7;

    // Määritä henkilöstön saatavuus vuorokauden aikana
    let doctorsAvailable, nursesAvailable;

    if (hourOfDay >= 7 && hourOfDay < 15) {
      doctorsAvailable = params.staff.doctors.day;
      nursesAvailable = params.staff.nurses.day;
    } else if (hourOfDay >= 15 && hourOfDay < 23) {
      doctorsAvailable = params.staff.doctors.evening;
      nursesAvailable = params.staff.nurses.evening;
    } else {
      doctorsAvailable = params.staff.doctors.night;
      nursesAvailable = params.staff.nurses.night;
    }

    // Päivän sisäinen kuvio ja viikonpäivän vaikutus
    const timeOfDayFactor = edHourlyPattern[hourOfDay];
    const edDayFactor = dayOfWeekPattern[dayOfWeek];
    const wardDayFactor = wardDayOfWeekPattern[dayOfWeek];

    // Pitkän aikavälin trendi
    const trendFactor = 1 + trendDirection * trendStrength * dayOfSim;

    // Henkilöstön vaikutus käyttöasteeseen
    const staffFactor = (doctorsAvailable / 4 + nursesAvailable / 9) / 2;

    // Satunnaisvaihtelu
    const edRandomFactor = 0.9 + Math.random() * 0.2;
    const wardRandomFactor = 0.95 + Math.random() * 0.1;

    // Päivystyksen vuodepaikat käytössä
    let edOcc = Math.round(avgEdOcc * timeOfDayFactor * edDayFactor * trendFactor *
      (1 / Math.sqrt(staffFactor)) * edRandomFactor);

    edOcc = Math.min(params.ed_beds_capacity, Math.max(0, edOcc));

    // Osastopaikat käytössä
    const prevDayFactor = dayOfWeekPattern[(dayOfWeek + 6) % 7];
    const wardLagEffect = (prevDayFactor - 1) * 0.5 + 1;

    let wardOcc = Math.round(avgWardOcc * wardDayFactor * wardLagEffect * trendFactor * wardRandomFactor);
    wardOcc = Math.min(params.ward_beds_capacity, Math.max(0, wardOcc));

    // Odotusaika
    const staffLoad = Math.min(5, (edOcc / doctorsAvailable) * (10 / nursesAvailable));
    // Käytä epälineaarista funktiota, jossa on yläraja odotusajalle
    let waitTime = results.avg_wait * (timeOfDayFactor * Math.min(2.5, staffLoad) / 1.2) * edRandomFactor;
    // Varmista ettei odotusaika ylitä realistista ylärajaa (4h = 240min)
    waitTime = Math.min(240, Math.max(0, waitTime));

    // Lisää tulokset
    edOccData.push(edOcc);
    wardOccData.push(wardOcc);
    waitTimes.push(waitTime);
  }

  results.times = times;
  results.ed_occ_data = edOccData;
  results.ward_occ_data = wardOccData;
  results.wait_times = waitTimes;

  return results;
}

// Initialize ER Flow Simulator
document.addEventListener('DOMContentLoaded', function () {
  // Tallennettujen simulaatioiden hallinta
  const savedSimulations = [];
  const simulationColors = [
    '#2a6ebb', '#4caf50', '#e74c3c', '#8e44ad',
    '#e67e22', '#f1c40f', '#1abc9c', '#95a5a6'
  ];

  // Tab switching functionality for ER Flow
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

  // Skenaarioiden käsittely
  const scenarioSelect = document.getElementById('scenario');

  function updateFromScenario() {
    const scenario = scenarioSelect.value;

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

  scenarioSelect.addEventListener('change', updateFromScenario);

  // Go to parameters button
  document.getElementById('go-to-parameters').addEventListener('click', () => {
    tabs[0].click();
  });

  // Hakee kaikki nykyiset parametrit käyttöliittymästä
  function getCurrentParams() {
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

  // Expose to window for access from other scripts
  window.erFlowSimulator = {
    getCurrentParams,
    generateDemoResults,
    savedSimulations,
    simulationColors
  };
});
