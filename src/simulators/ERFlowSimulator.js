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
   */
  constructor() {
    super();
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
  }

  /**
   * Schedule initial events
   * @protected
   */
  _scheduleInitialEvents() {
    // Schedule patient arrivals for the entire simulation
    const totalHours = this.config.duration_days * 24;
    
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
      
      // Schedule each patient arrival within this hour
      for (let i = 0; i < actualArrivals; i++) {
        const arrivalTime = hour * 60 + Math.random() * 60; // Random minute within the hour
        this.schedulePatientArrival(arrivalTime);
      }
    }
  }

  /**
   * Schedule a patient arrival
   * @param {number} time - Arrival time
   */
  schedulePatientArrival(time) {
    this.patientCounter++;
    const patient = new Patient(this.patientCounter, time);
    this.scheduleEvent(time, patient, 'arrival');
  }

  /**
   * Process an event
   * @param {Object} event - The event to process
   * @protected
   */
  _processEvent(event) {
    const { time, entity, eventType, data } = event;
    
    switch (eventType) {
      case 'arrival':
        this.processPatientArrival(entity, time);
        break;
      case 'triage_complete':
        this.processTriageComplete(entity, time);
        break;
      case 'treatment_complete':
        this.processTreatmentComplete(entity, time);
        break;
      case 'admission_decision':
        this.processAdmissionDecision(entity, time);
        break;
      case 'admission_complete':
        this.processAdmissionComplete(entity, time);
        break;
      case 'discharge':
        this.processDischarge(entity, time);
        break;
      case 'hourly_update':
        this.processHourlyUpdate(time);
        break;
      default:
        console.log(`Unknown event type: ${eventType}`);
    }
  }

  /**
   * Process a patient arrival event
   * @param {Patient} patient - The arriving patient
   * @param {number} time - Current simulation time
   */
  processPatientArrival(patient, time) {
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
  }

  /**
   * Process triage completion event
   * @param {Patient} patient - The patient
   * @param {number} time - Current simulation time
   */
  processTriageComplete(patient, time) {
    patient.setStatus('triaged', time);
    
    // Allocate ED bed if available
    const edBeds = this.getResource('ed_beds');
    if (edBeds.allocate(patient, 1, time)) {
      patient.setLocation('ed_bed', time);
      
      // Schedule treatment based on acuity
      const treatmentTime = patient.getExpectedTreatmentTime();
      this.scheduleEvent(time + treatmentTime, patient, 'treatment_complete');
    } else {
      // No bed available, put in waiting area
      patient.setLocation('waiting_area', time);
      
      // Schedule hourly check for bed availability
      this.scheduleEvent(time + 60, patient, 'bed_check');
    }
    
    // Update hourly stats
    this.updateHourlyStats(time);
  }

  /**
   * Process treatment completion event
   * @param {Patient} patient - The patient
   * @param {number} time - Current simulation time
   */
  processTreatmentComplete(patient, time) {
    patient.setStatus('treatment_complete', time);
    
    // Make admission decision
    this.scheduleEvent(time + 10, patient, 'admission_decision');
  }

  /**
   * Process admission decision event
   * @param {Patient} patient - The patient
   * @param {number} time - Current simulation time
   */
  processAdmissionDecision(patient, time) {
    // Determine if patient needs admission
    const admissionProbability = patient.getAdmissionProbability();
    
    if (Math.random() < admissionProbability) {
      // Patient needs admission
      patient.setStatus('admission_pending', time);
      
      // Check if ward bed is available
      const wardBeds = this.getResource('ward_beds');
      if (wardBeds.allocate(patient, 1, time)) {
        // Ward bed available, schedule admission
        const transferTime = 30 + Math.random() * 30; // 30-60 minutes for transfer
        this.scheduleEvent(time + transferTime, patient, 'admission_complete');
      } else {
        // No ward bed, patient is boarding in ED
        patient.setStatus('boarding', time);
        
        // Schedule hourly check for ward bed
        this.scheduleEvent(time + 60, patient, 'ward_bed_check');
      }
    } else {
      // Patient can be discharged
      this.scheduleEvent(time + 30, patient, 'discharge'); // 30 minutes for discharge process
    }
  }

  /**
   * Process admission completion event
   * @param {Patient} patient - The patient
   * @param {number} time - Current simulation time
   */
  processAdmissionComplete(patient, time) {
    // Release ED bed
    const edBeds = this.getResource('ed_beds');
    edBeds.release(patient, time);
    
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
    
    // Update hourly stats
    this.updateHourlyStats(time);
  }

  /**
   * Process discharge event
   * @param {Patient} patient - The patient
   * @param {number} time - Current simulation time
   */
  processDischarge(patient, time) {
    // Release resources
    if (patient.currentLocation === 'ed_bed') {
      const edBeds = this.getResource('ed_beds');
      edBeds.release(patient, time);
    } else if (patient.currentLocation === 'ward') {
      const wardBeds = this.getResource('ward_beds');
      wardBeds.release(patient, time);
    }
    
    // Update patient status
    patient.setStatus('discharged', time);
    patient.setLocation('discharged', time);
    
    // Add to discharged patients list
    this.dischargedPatients.push(patient);
    
    // Remove from entities
    this.removeEntity(patient);
    
    // Update hourly stats
    this.updateHourlyStats(time);
  }

  /**
   * Process hourly update event
   * @param {number} time - Current simulation time
   */
  processHourlyUpdate(time) {
    this.updateHourlyStats(time);
    
    // Schedule next hourly update
    const nextHour = Math.floor(time / 60) + 1;
    this.scheduleEvent(nextHour * 60, null, 'hourly_update');
  }

  /**
   * Update hourly statistics
   * @param {number} time - Current simulation time
   */
  updateHourlyStats(time) {
    const hour = Math.floor(time / 60);
    if (hour >= this.hourlyEdOccupancy.length) return;
    
    // Count patients in ED and wards
    let edPatients = 0;
    let wardPatients = 0;
    let waitingPatients = 0;
    let waitingTimes = [];
    
    this.entities.forEach(entity => {
      if (entity.currentLocation === 'ed_bed' || entity.currentLocation === 'waiting_area') {
        edPatients++;
        
        // Calculate waiting time for patients in waiting area
        if (entity.status === 'triaged' && entity.currentLocation === 'waiting_area') {
          waitingPatients++;
          const waitTime = time - entity.statusChangeTime;
          waitingTimes.push(waitTime);
        }
      } else if (entity.currentLocation === 'ward') {
        wardPatients++;
      }
    });
    
    // Update hourly occupancy
    this.hourlyEdOccupancy[hour] = edPatients;
    this.hourlyWardOccupancy[hour] = wardPatients;
    
    // Update hourly wait times
    if (waitingTimes.length > 0) {
      const avgWaitTime = waitingTimes.reduce((sum, time) => sum + time, 0) / waitingTimes.length;
      this.hourlyWaitTimes[hour] = avgWaitTime;
    } else {
      // If no one is waiting, use the last known wait time or 0
      this.hourlyWaitTimes[hour] = hour > 0 ? this.hourlyWaitTimes[hour - 1] : 0;
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
    
    // Prepare time series data
    const times = Array.from({ length: this.hourlyEdOccupancy.length }, (_, i) => i);
    
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
      discharged_count: this.dischargedPatients.length
    };
  }
}

// Export the ERFlowSimulator class
export default ERFlowSimulator;
