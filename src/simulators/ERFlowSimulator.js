import SimulationEngine from './SimulationEngine.js';
import Patient from '../models/Patient.js';
import { Staff, Bed } from '../models/Resource.js';

/**
 * ER Flow Simulator class
 * Simulates patient flow through an emergency department and hospital wards
 */
class ERFlowSimulator extends SimulationEngine {
  /**
   * Constructor for the ER Flow Simulator
   * @param {Object} options - Simulation options
   */
  constructor(options = {}) {
    super(options);
    this.patientCounter = 0;
    this.hourlyPatientArrivals = [];
    this.hourlyEdOccupancy = [];
    this.hourlyWardOccupancy = [];
    this.hourlyWaitTimes = [];
    this.admittedPatients = [];
    this.dischargedPatients = [];
    this.hourlyArrivalRates = {
      morning: 8,   // 6-12
      afternoon: 7, // 12-18
      evening: 5,   // 18-24
      night: 3      // 0-6
    };
    this.hourlyPatterns = [
      0.5, 0.4, 0.3, 0.25, 0.2, 0.3, 0.4, 0.6, 0.8, 1.0, 1.2, 1.3,
      1.4, 1.5, 1.5, 1.6, 1.7, 1.8, 1.7, 1.6, 1.4, 1.2, 1.0, 0.7
    ];
    this.dayOfWeekPatterns = [1.0, 0.95, 1.0, 1.05, 1.1, 1.3, 1.2]; // Mon-Sun
    this.wardDayOfWeekPatterns = [1.05, 1.02, 1.0, 0.98, 0.95, 0.9, 0.92]; // Mon-Sun

    // Register event handlers
    this.registerEventHandler('arrival', this.processPatientArrival.bind(this));
    this.registerEventHandler('triage_complete', this.processTriageComplete.bind(this));
    this.registerEventHandler('treatment_complete', this.processTreatmentComplete.bind(this));
    this.registerEventHandler('admission_decision', this.processAdmissionDecision.bind(this));
    this.registerEventHandler('admission_complete', this.processAdmissionComplete.bind(this));
    this.registerEventHandler('discharge', this.processDischarge.bind(this));
    this.registerEventHandler('hourly_update', this.processHourlyUpdate.bind(this));
    this.registerEventHandler('bed_check', this.processBedCheck.bind(this));
    this.registerEventHandler('ward_bed_check', this.processWardBedCheck.bind(this));
  }

  /**
   * Initialize the simulation with configuration
   * @param {Object} config - Configuration parameters for the simulation
   */
  initialize(config) {
    super.initialize(config);

    this.patientCounter = 0;
    this.hourlyPatientArrivals = [];
    this.hourlyEdOccupancy = [];
    this.hourlyWardOccupancy = [];
    this.hourlyWaitTimes = [];
    this.admittedPatients = [];
    this.dischargedPatients = [];

    // Set arrival rates from config
    if (config.arrival_rates) {
      this.hourlyArrivalRates = config.arrival_rates;
    }

    // Initialize arrays for hourly data
    const totalHours = config.duration_days * 24;
    this.hourlyPatientArrivals = new Array(totalHours).fill(0);
    this.hourlyEdOccupancy = new Array(totalHours).fill(0);
    this.hourlyWardOccupancy = new Array(totalHours).fill(0);
    this.hourlyWaitTimes = new Array(totalHours).fill(0);

    // Log initialization
    this.logger.info('er_flow', 'ER Flow Simulator initialized', null, {
      config: this.config,
      totalHours
    }, this.currentTime);
  }

  /**
   * Initialize resources based on configuration
   * @protected
   */
  _initializeResources() {
    const config = this.config;

    // Initialize staff resources
    this.addResource('doctors_day', new Staff('doctors_day', 'doctor', config.staff.doctors.day, { shift: 'day' }));
    this.addResource('doctors_evening', new Staff('doctors_evening', 'doctor', config.staff.doctors.evening, { shift: 'evening' }));
    this.addResource('doctors_night', new Staff('doctors_night', 'doctor', config.staff.doctors.night, { shift: 'night' }));

    this.addResource('nurses_day', new Staff('nurses_day', 'nurse', config.staff.nurses.day, { shift: 'day' }));
    this.addResource('nurses_evening', new Staff('nurses_evening', 'nurse', config.staff.nurses.evening, { shift: 'evening' }));
    this.addResource('nurses_night', new Staff('nurses_night', 'nurse', config.staff.nurses.night, { shift: 'night' }));

    // Initialize bed resources
    this.addResource('ed_beds', new Bed('ed_beds', 'emergency', config.ed_beds_capacity, { location: 'emergency' }));
    this.addResource('ward_beds', new Bed('ward_beds', 'ward', config.ward_beds_capacity, { location: 'ward' }));

    // Log resource initialization
    this.logger.info('resources', 'Resources initialized', null, {
      doctors: {
        day: config.staff.doctors.day,
        evening: config.staff.doctors.evening,
        night: config.staff.doctors.night
      },
      nurses: {
        day: config.staff.nurses.day,
        evening: config.staff.nurses.evening,
        night: config.staff.nurses.night
      },
      ed_beds: config.ed_beds_capacity,
      ward_beds: config.ward_beds_capacity
    }, this.currentTime);
  }

  /**
   * Schedule initial events
   * @protected
   */
  _scheduleInitialEvents() {
    // Schedule patient arrivals for the entire simulation
    const totalHours = this.config.duration_days * 24;

    // Schedule hourly updates
    for (let hour = 1; hour <= totalHours; hour++) {
      this.scheduleEvent(hour * 60, null, 'hourly_update');
    }

    // Log the start of scheduling
    this.logger.info('scheduling', 'Scheduling patient arrivals', null, {
      totalHours,
      expectedTotalPatients: this.config.duration_days *
        (this.hourlyArrivalRates.morning + this.hourlyArrivalRates.afternoon +
          this.hourlyArrivalRates.evening + this.hourlyArrivalRates.night) / 4 * 24
    }, this.currentTime);

    // Schedule patient arrivals
    let totalScheduledArrivals = 0;

    for (let hour = 0; hour < totalHours; hour++) {
      // Determine arrival rate for this hour
      const hourOfDay = hour % 24;
      const dayOfSim = Math.floor(hour / 24);
      const dayOfWeek = dayOfSim % 7;

      // Get base arrival rate for this time of day
      let baseRate;
      if (hourOfDay >= 6 && hourOfDay < 12) {
        baseRate = this.hourlyArrivalRates.morning;
      } else if (hourOfDay >= 12 && hourOfDay < 18) {
        baseRate = this.hourlyArrivalRates.afternoon;
      } else if (hourOfDay >= 18 && hourOfDay < 24) {
        baseRate = this.hourlyArrivalRates.evening;
      } else {
        baseRate = this.hourlyArrivalRates.night;
      }

      // Apply hourly pattern
      const hourlyFactor = this.hourlyPatterns[hourOfDay];

      // Apply day of week pattern
      const dayFactor = this.dayOfWeekPatterns[dayOfWeek];

      // Calculate expected arrivals for this hour
      const expectedArrivals = baseRate * hourlyFactor * dayFactor;

      // Generate random number of arrivals using Poisson distribution
      const actualArrivals = this.poissonRandom(expectedArrivals);
      this.hourlyPatientArrivals[hour] = actualArrivals;
      totalScheduledArrivals += actualArrivals;

      // Schedule each patient arrival within this hour
      for (let i = 0; i < actualArrivals; i++) {
        const arrivalTime = hour * 60 + Math.random() * 60; // Random minute within the hour
        this.schedulePatientArrival(arrivalTime);
      }

      // Log scheduling progress periodically
      if (hour % 24 === 0 && hour > 0) {
        this.logger.debug('scheduling', `Scheduled arrivals for day ${dayOfSim}`, null, {
          dayArrivals: this.hourlyPatientArrivals.slice(hour - 24, hour).reduce((sum, val) => sum + val, 0),
          totalScheduledSoFar: totalScheduledArrivals
        }, this.currentTime);
      }
    }

    // Log completion of scheduling
    this.logger.info('scheduling', 'Patient arrivals scheduled', null, {
      totalScheduledArrivals,
      averagePerDay: totalScheduledArrivals / this.config.duration_days
    }, this.currentTime);
  }

  /**
   * Schedule a patient arrival
   * @param {number} time - Arrival time
   */
  schedulePatientArrival(time) {
    this.patientCounter++;
    const patient = new Patient(this.patientCounter, time);

    // Add some attributes for the entity manager to index
    patient.type = 'patient';

    // Schedule the arrival event
    this.scheduleEvent(time, patient, 'arrival');
  }

  /**
   * Process an event
   * @param {Object} event - The event to process
   * @protected
   */
  _processEvent(event) {
    // Most events are handled by registered event handlers
    // This method handles any events not covered by registered handlers
    const { time, entity, eventType, data } = event;

    if (eventType === 'bed_check' && !this.eventHandlers.has('bed_check')) {
      this.processBedCheck(event);
    } else if (eventType === 'ward_bed_check' && !this.eventHandlers.has('ward_bed_check')) {
      this.processWardBedCheck(event);
    }
  }

  /**
   * Process a patient arrival event
   * @param {Object} event - The event object
   */
  processPatientArrival(event) {
    const { time, entity: patient } = event;

    // Set initial patient status and location
    patient.setStatus('arrived', time);
    patient.setLocation('triage', time);

    // Add patient to entities
    this.addEntity(patient);

    // Schedule triage completion
    const triageTime = 5 + Math.random() * 10; // 5-15 minutes for triage
    this.scheduleEvent(time + triageTime, patient, 'triage_complete');

    // Update hourly stats
    const hour = Math.floor(time / 60);
    if (hour < this.hourlyPatientArrivals.length) {
      this.hourlyPatientArrivals[hour]++;
    }

    // Log patient arrival
    this.logger.info('patient', `Patient ${patient.id} arrived`, patient, {
      acuityLevel: patient.acuityLevel,
      age: patient.age,
      triageTime
    }, time);
  }

  /**
   * Process triage completion event
   * @param {Object} event - The event object
   */
  processTriageComplete(event) {
    const { time, entity: patient } = event;

    patient.setStatus('triaged', time);

    // Allocate ED bed if available
    const edBeds = this.getResource('ed_beds');
    if (this.allocateResource('ed_beds', patient, 1)) {
      patient.setLocation('ed_bed', time);

      // Schedule treatment based on acuity
      const treatmentTime = patient.getExpectedTreatmentTime();
      this.scheduleEvent(time + treatmentTime, patient, 'treatment_complete');

      this.logger.info('patient', `Patient ${patient.id} allocated ED bed`, patient, {
        treatmentTime,
        expectedCompletionTime: time + treatmentTime
      }, time);
    } else {
      // No bed available, put in waiting area
      patient.setLocation('waiting_area', time);

      // Schedule hourly check for bed availability
      this.scheduleEvent(time + 60, patient, 'bed_check');

      this.logger.info('patient', `Patient ${patient.id} waiting for ED bed`, patient, {
        bedsAvailable: edBeds.available,
        bedsCapacity: edBeds.capacity
      }, time);
    }

    // Update hourly stats
    this.updateHourlyStats(time);
  }

  /**
   * Process bed check event
   * @param {Object} event - The event object
   */
  processBedCheck(event) {
    const { time, entity: patient } = event;

    // Check if patient is still waiting
    if (patient.status !== 'triaged' || patient.currentLocation !== 'waiting_area') {
      return;
    }

    // Try to allocate ED bed
    const edBeds = this.getResource('ed_beds');
    if (this.allocateResource('ed_beds', patient, 1)) {
      patient.setLocation('ed_bed', time);

      // Schedule treatment based on acuity
      const treatmentTime = patient.getExpectedTreatmentTime();
      this.scheduleEvent(time + treatmentTime, patient, 'treatment_complete');

      this.logger.info('patient', `Patient ${patient.id} allocated ED bed after waiting`, patient, {
        waitTime: time - patient.statusChangeTime,
        treatmentTime,
        expectedCompletionTime: time + treatmentTime
      }, time);
    } else {
      // No bed available, schedule another check
      this.scheduleEvent(time + 60, patient, 'bed_check');

      this.logger.debug('patient', `Patient ${patient.id} still waiting for ED bed`, patient, {
        waitTime: time - patient.statusChangeTime,
        bedsAvailable: edBeds.available,
        bedsCapacity: edBeds.capacity
      }, time);
    }

    // Update hourly stats
    this.updateHourlyStats(time);
  }

  /**
   * Process treatment completion event
   * @param {Object} event - The event object
   */
  processTreatmentComplete(event) {
    const { time, entity: patient } = event;

    patient.setStatus('treatment_complete', time);

    // Make admission decision
    this.scheduleEvent(time + 10, patient, 'admission_decision');

    this.logger.info('patient', `Patient ${patient.id} treatment complete`, patient, {
      treatmentDuration: time - patient.locationChangeTime,
      nextStep: 'admission_decision'
    }, time);
  }

  /**
   * Process admission decision event
   * @param {Object} event - The event object
   */
  processAdmissionDecision(event) {
    const { time, entity: patient } = event;

    // Determine if patient needs admission
    const admissionProbability = patient.getAdmissionProbability();

    if (Math.random() < admissionProbability) {
      // Patient needs admission
      patient.setStatus('admission_pending', time);

      // Check if ward bed is available
      const wardBeds = this.getResource('ward_beds');
      if (this.allocateResource('ward_beds', patient, 1)) {
        // Ward bed available, schedule admission
        const transferTime = 30 + Math.random() * 30; // 30-60 minutes for transfer
        this.scheduleEvent(time + transferTime, patient, 'admission_complete');

        this.logger.info('patient', `Patient ${patient.id} will be admitted to ward`, patient, {
          transferTime,
          expectedAdmissionTime: time + transferTime
        }, time);
      } else {
        // No ward bed, patient is boarding in ED
        patient.setStatus('boarding', time);

        // Schedule hourly check for ward bed
        this.scheduleEvent(time + 60, patient, 'ward_bed_check');

        this.logger.info('patient', `Patient ${patient.id} boarding in ED`, patient, {
          wardBedsAvailable: wardBeds.available,
          wardBedsCapacity: wardBeds.capacity
        }, time);
      }
    } else {
      // Patient can be discharged
      this.scheduleEvent(time + 30, patient, 'discharge'); // 30 minutes for discharge process

      this.logger.info('patient', `Patient ${patient.id} will be discharged`, patient, {
        expectedDischargeTime: time + 30
      }, time);
    }
  }

  /**
   * Process ward bed check event
   * @param {Object} event - The event object
   */
  processWardBedCheck(event) {
    const { time, entity: patient } = event;

    // Check if patient is still boarding
    if (patient.status !== 'boarding') {
      return;
    }

    // Try to allocate ward bed
    const wardBeds = this.getResource('ward_beds');
    if (this.allocateResource('ward_beds', patient, 1)) {
      // Ward bed available, schedule admission
      const transferTime = 30 + Math.random() * 30; // 30-60 minutes for transfer
      this.scheduleEvent(time + transferTime, patient, 'admission_complete');

      this.logger.info('patient', `Patient ${patient.id} allocated ward bed after boarding`, patient, {
        boardingTime: time - patient.statusChangeTime,
        transferTime,
        expectedAdmissionTime: time + transferTime
      }, time);
    } else {
      // No ward bed available, schedule another check
      this.scheduleEvent(time + 60, patient, 'ward_bed_check');

      this.logger.debug('patient', `Patient ${patient.id} still boarding in ED`, patient, {
        boardingTime: time - patient.statusChangeTime,
        wardBedsAvailable: wardBeds.available,
        wardBedsCapacity: wardBeds.capacity
      }, time);
    }

    // Update hourly stats
    this.updateHourlyStats(time);
  }

  /**
   * Process admission completion event
   * @param {Object} event - The event object
   */
  processAdmissionComplete(event) {
    const { time, entity: patient } = event;

    // Release ED bed
    this.releaseResource('ed_beds', patient);

    // Update patient status and location
    patient.setStatus('admitted', time);
    patient.setLocation('ward', time);

    // Add to admitted patients list
    this.admittedPatients.push(patient);

    // Schedule discharge from ward
    // Length of stay depends on acuity and comorbidities
    const baseStayDays = 3 + (patient.acuityLevel === 1 ? 4 :
      patient.acuityLevel === 2 ? 2 :
        patient.acuityLevel === 3 ? 1 : 0);
    const comorbidityImpact = patient.getComorbidityImpact();
    const stayDays = baseStayDays * (1 + comorbidityImpact);

    // Convert days to minutes
    const stayMinutes = stayDays * 24 * 60;

    // Add some randomness
    const actualStayMinutes = stayMinutes * (0.8 + Math.random() * 0.4); // 80-120% of expected

    this.scheduleEvent(time + actualStayMinutes, patient, 'discharge');

    this.logger.info('patient', `Patient ${patient.id} admitted to ward`, patient, {
      totalTimeInED: time - patient.arrivalTime,
      expectedStayDays: stayDays,
      expectedDischargeTime: time + actualStayMinutes
    }, time);

    // Update hourly stats
    this.updateHourlyStats(time);
  }

  /**
   * Process discharge event
   * @param {Object} event - The event object
   */
  processDischarge(event) {
    const { time, entity: patient } = event;

    // Release resources
    if (patient.currentLocation === 'ed_bed') {
      this.releaseResource('ed_beds', patient);
    } else if (patient.currentLocation === 'ward') {
      this.releaseResource('ward_beds', patient);
    }

    // Update patient status
    patient.setStatus('discharged', time);
    patient.setLocation('discharged', time);

    // Add to discharged patients list
    this.dischargedPatients.push(patient);

    // Calculate total length of stay
    const totalStay = time - patient.arrivalTime;
    const totalStayDays = totalStay / (24 * 60);

    this.logger.info('patient', `Patient ${patient.id} discharged`, patient, {
      totalStay,
      totalStayDays,
      fromLocation: patient.previousLocation
    }, time);

    // Remove from entities
    this.removeEntity(patient);

    // Update hourly stats
    this.updateHourlyStats(time);
  }

  /**
   * Process hourly update event
   * @param {Object} event - The event object
   */
  processHourlyUpdate(event) {
    const { time } = event;

    this.updateHourlyStats(time);

    // Schedule next hourly update
    const nextHour = Math.floor(time / 60) + 1;
    this.scheduleEvent(nextHour * 60, null, 'hourly_update');

    // Log hourly statistics
    const hour = Math.floor(time / 60);
    if (hour < this.hourlyEdOccupancy.length) {
      this.logger.debug('stats', `Hourly update at hour ${hour}`, null, {
        edOccupancy: this.hourlyEdOccupancy[hour],
        wardOccupancy: this.hourlyWardOccupancy[hour],
        waitTime: this.hourlyWaitTimes[hour],
        arrivals: this.hourlyPatientArrivals[hour]
      }, time);
    }
  }

  /**
   * Update hourly statistics
   * @param {number} time - Current simulation time
   */
  updateHourlyStats(time) {
    const hour = Math.floor(time / 60);
    if (hour >= this.hourlyEdOccupancy.length) return;

    // Count patients in ED and wards
    const edBedPatients = this.entityManager.getEntitiesByAttribute('currentLocation', 'ed_bed').length;
    const waitingAreaPatients = this.entityManager.getEntitiesByAttribute('currentLocation', 'waiting_area').length;
    const wardPatients = this.entityManager.getEntitiesByAttribute('currentLocation', 'ward').length;

    const edPatients = edBedPatients + waitingAreaPatients;

    // Get waiting patients and calculate waiting times
    const waitingPatients = this.entityManager.queryEntities(entity =>
      entity.status === 'triaged' && entity.currentLocation === 'waiting_area'
    );

    const waitingTimes = waitingPatients.map(patient => time - patient.statusChangeTime);

    // Update hourly occupancy
    this.hourlyEdOccupancy[hour] = edPatients;
    this.hourlyWardOccupancy[hour] = wardPatients;

    // Update hourly wait times
    if (waitingTimes.length > 0) {
      const avgWaitTime = waitingTimes.reduce((sum, t) => sum + t, 0) / waitingTimes.length;
      this.hourlyWaitTimes[hour] = avgWaitTime;
    } else {
      // If no one is waiting, use the last known wait time or 0
      this.hourlyWaitTimes[hour] = hour > 0 ? this.hourlyWaitTimes[hour - 1] : 0;
    }

    // Log detailed statistics periodically (every 6 hours)
    if (hour % 6 === 0) {
      this.logger.info('stats', `Detailed statistics at hour ${hour}`, null, {
        edPatients,
        edBedPatients,
        waitingAreaPatients,
        wardPatients,
        waitingPatients: waitingPatients.length,
        avgWaitTime: this.hourlyWaitTimes[hour],
        totalPatients: this.entityManager.getEntityCount(),
        admittedPatients: this.admittedPatients.length,
        dischargedPatients: this.dischargedPatients.length
      }, time);
    }
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
    // Calculate average wait time
    const waitTimes = this.hourlyWaitTimes.filter(time => time > 0);
    const avgWaitTime = waitTimes.length > 0
      ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
      : 0;

    // Calculate average length of stay for admitted patients
    const losValues = this.admittedPatients
      .filter(p => p.discharged)
      .map(p => (p.dischargeTime - p.arrivalTime) / (60 * 24)); // Convert to days

    const avgLOS = losValues.length > 0
      ? losValues.reduce((sum, los) => sum + los, 0) / losValues.length
      : 0;

    // Calculate average occupancy rates
    const edBeds = this.getResource('ed_beds');
    const wardBeds = this.getResource('ward_beds');

    const edOccupancy = this.hourlyEdOccupancy.reduce((sum, occ) => sum + occ, 0) /
      (this.hourlyEdOccupancy.length * edBeds.capacity) * 100;

    const wardOccupancy = this.hourlyWardOccupancy.reduce((sum, occ) => sum + occ, 0) /
      (this.hourlyWardOccupancy.length * wardBeds.capacity) * 100;

    // Get resource utilization statistics
    const edBedsStats = this.getResourceStats('ed_beds');
    const wardBedsStats = this.getResourceStats('ward_beds');

    // Prepare time series data
    const times = Array.from({ length: this.hourlyEdOccupancy.length }, (_, i) => i);

    // Get simulation statistics
    const simStats = this.getStatistics();

    // Log final results
    this.logger.info('results', 'Simulation results collected', null, {
      avgWaitTime,
      avgLOS,
      edOccupancy,
      wardOccupancy,
      admittedCount: this.admittedPatients.length,
      dischargedCount: this.dischargedPatients.length,
      simulationTime: this.currentTime,
      processingTime: simStats.processingTime,
      eventCount: simStats.eventCount
    }, this.currentTime);

    // Return results object
    return {
      avg_wait: avgWaitTime,
      avg_los: avgLOS,
      ed_occupancy: edOccupancy,
      ward_occupancy: wardOccupancy,
      max_ed_occupancy: Math.max(...this.hourlyEdOccupancy) / edBeds.capacity * 100,
      max_ward_occupancy: Math.max(...this.hourlyWardOccupancy) / wardBeds.capacity * 100,
      times: times,
      ed_occ_data: this.hourlyEdOccupancy,
      ward_occ_data: this.hourlyWardOccupancy,
      wait_times: this.hourlyWaitTimes,
      patient_arrivals: this.hourlyPatientArrivals,
      admitted_count: this.admittedPatients.length,
      discharged_count: this.dischargedPatients.length,
      resource_stats: {
        ed_beds: edBedsStats ? {
          totalAllocations: edBedsStats.totalAllocations,
          totalReleases: edBedsStats.totalReleases,
          peakAllocations: edBedsStats.peakAllocations,
          capacity: edBeds.capacity
        } : null,
        ward_beds: wardBedsStats ? {
          totalAllocations: wardBedsStats.totalAllocations,
          totalReleases: wardBedsStats.totalReleases,
          peakAllocations: wardBedsStats.peakAllocations,
          capacity: wardBeds.capacity
        } : null
      },
      simulation_stats: {
        duration: this.currentTime,
        processing_time_ms: simStats.processingTime,
        event_count: simStats.eventCount,
        entity_count: simStats.entityCount
      }
    };
  }
}

// Export the ERFlowSimulator class
export default ERFlowSimulator;
