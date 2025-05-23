/**
 * HospitalDepartmentSimulator.js
 * Hospital simulator with specialized departments
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import Logger from '../utils/Logger.js';
import DepartmentManager from '../models/DepartmentManager.js';
import EmergencyDepartment from '../models/EmergencyDepartment.js';
import IntensiveCareUnit from '../models/IntensiveCareUnit.js';
import Ward from '../models/Ward.js';

/**
 * Hospital Department Simulator class
 * Simulates a hospital with specialized departments
 */
class HospitalDepartmentSimulator extends EventEmitter {
  /**
   * Constructor for the HospitalDepartmentSimulator class
   * @param {Object} config - Simulator configuration
   * @param {Object} options - Simulator options
   */
  constructor(config, options = {}) {
    super();
    
    this.config = {
      duration_days: config.duration_days || 7,
      arrival_rates: config.arrival_rates || {
        morning: 8,
        afternoon: 10,
        evening: 6,
        night: 3
      },
      acuity_distribution: config.acuity_distribution || 'normal',
      departments: config.departments || {},
      ...config
    };
    
    this.options = {
      debug: options.debug || false,
      speedFactor: options.speedFactor || 1,
      ...options
    };
    
    // Logger
    this.logger = options.logger || new Logger({ level: 'info' });
    
    // Simulation state
    this.currentTime = 0;
    this.patients = new Map();
    this.patientCounter = 0;
    this.isRunning = false;
    this.isPaused = false;
    
    // Department manager
    this.departmentManager = new DepartmentManager({
      logger: this.logger,
      debug: this.options.debug,
      speedFactor: this.options.speedFactor
    });
    
    // Departments
    this.departments = new Map();
    
    // Initialize
    this.initialize(config);
  }
  
  /**
   * Initialize the simulator
   * @param {Object} config - Simulator configuration
   */
  initialize(config) {
    this.logger.info('simulator', 'Initializing hospital department simulator', null, config);
    
    // Create departments
    this.createDepartments(config);
    
    // Register event handlers
    this.registerEventHandlers();
  }
  
  /**
   * Create departments
   * @param {Object} config - Simulator configuration
   */
  createDepartments(config) {
    // Create Emergency Department
    const edConfig = config.departments.ed || {};
    const ed = new EmergencyDepartment({
      id: 'ed',
      name: 'Emergency Department',
      beds: edConfig.beds || 50,
      staff: edConfig.staff || {
        doctor: 10,
        nurse: 20,
        technician: 5
      },
      resuscitationBays: edConfig.resuscitationBays || 2,
      traumaBays: edConfig.traumaBays || 4,
      fastTrackBeds: edConfig.fastTrackBeds || 10,
      ...edConfig
    }, {
      logger: this.logger,
      debug: this.options.debug,
      speedFactor: this.options.speedFactor
    });
    
    this.departments.set('ed', ed);
    this.departmentManager.registerDepartment(ed);
    
    // Create Intensive Care Unit
    const icuConfig = config.departments.icu || {};
    const icu = new IntensiveCareUnit({
      id: 'icu',
      name: 'Intensive Care Unit',
      beds: icuConfig.beds || 20,
      staff: icuConfig.staff || {
        doctor: 5,
        nurse: 15,
        respiratory_therapist: 3
      },
      isolationRooms: icuConfig.isolationRooms || 4,
      ...icuConfig
    }, {
      logger: this.logger,
      debug: this.options.debug,
      speedFactor: this.options.speedFactor
    });
    
    this.departments.set('icu', icu);
    this.departmentManager.registerDepartment(icu);
    
    // Create Medical Ward
    const medicalWardConfig = config.departments.medical_ward || {};
    const medicalWard = new Ward({
      id: 'medical_ward',
      name: 'Medical Ward',
      beds: medicalWardConfig.beds || 100,
      staff: medicalWardConfig.staff || {
        doctor: 10,
        nurse: 30,
        aide: 15
      },
      privateRooms: medicalWardConfig.privateRooms || 20,
      sharedRooms: medicalWardConfig.sharedRooms || 20,
      bedsPerRoom: medicalWardConfig.bedsPerRoom || 4,
      ...medicalWardConfig
    }, {
      logger: this.logger,
      debug: this.options.debug,
      speedFactor: this.options.speedFactor
    });
    
    this.departments.set('medical_ward', medicalWard);
    this.departmentManager.registerDepartment(medicalWard);
    
    // Create Surgical Ward
    const surgicalWardConfig = config.departments.surgical_ward || {};
    const surgicalWard = new Ward({
      id: 'surgical_ward',
      name: 'Surgical Ward',
      beds: surgicalWardConfig.beds || 80,
      staff: surgicalWardConfig.staff || {
        doctor: 8,
        nurse: 24,
        aide: 12
      },
      privateRooms: surgicalWardConfig.privateRooms || 16,
      sharedRooms: surgicalWardConfig.sharedRooms || 16,
      bedsPerRoom: surgicalWardConfig.bedsPerRoom || 4,
      ...surgicalWardConfig
    }, {
      logger: this.logger,
      debug: this.options.debug,
      speedFactor: this.options.speedFactor
    });
    
    this.departments.set('surgical_ward', surgicalWard);
    this.departmentManager.registerDepartment(surgicalWard);
  }
  
  /**
   * Register event handlers
   */
  registerEventHandlers() {
    // Register department manager event handlers
    this.departmentManager.on('patientAdmitted', this.handlePatientAdmitted.bind(this));
    this.departmentManager.on('patientDischarged', this.handlePatientDischarged.bind(this));
    this.departmentManager.on('patientTransferred', this.handlePatientTransferred.bind(this));
    this.departmentManager.on('transferFailed', this.handleTransferFailed.bind(this));
  }
  
  /**
   * Handle patient admitted event
   * @param {Object} event - Event data
   */
  handlePatientAdmitted(event) {
    const { patient, department, time } = event;
    
    // Add patient to simulator if not already present
    if (!this.patients.has(patient.id)) {
      this.patients.set(patient.id, patient);
    }
    
    // Emit event
    this.emit('patientAdmitted', {
      patient,
      department,
      time
    });
  }
  
  /**
   * Handle patient discharged event
   * @param {Object} event - Event data
   */
  handlePatientDischarged(event) {
    const { patient, department, time } = event;
    
    // Emit event
    this.emit('patientDischarged', {
      patient,
      department,
      time
    });
  }
  
  /**
   * Handle patient transferred event
   * @param {Object} event - Event data
   */
  handlePatientTransferred(event) {
    const { patient, fromDepartment, toDepartment, time } = event;
    
    // Emit event
    this.emit('patientTransferred', {
      patient,
      fromDepartment,
      toDepartment,
      time
    });
  }
  
  /**
   * Handle transfer failed event
   * @param {Object} event - Event data
   */
  handleTransferFailed(event) {
    const { patient, fromDepartment, toDepartment, reason, time } = event;
    
    // Emit event
    this.emit('transferFailed', {
      patient,
      fromDepartment,
      toDepartment,
      reason,
      time
    });
  }
  
  /**
   * Start the simulation
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('simulator', 'Simulation is already running');
      return;
    }
    
    this.isRunning = true;
    this.isPaused = false;
    this.currentTime = 0;
    
    // Reset departments
    for (const [id, department] of this.departments.entries()) {
      department.reset();
    }
    
    // Reset department manager
    this.departmentManager.reset();
    
    // Clear patients
    this.patients.clear();
    this.patientCounter = 0;
    
    // Emit start event
    this.emit('simulationStart', {
      time: this.currentTime
    });
    
    this.logger.info('simulator', 'Simulation started');
  }
  
  /**
   * Stop the simulation
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('simulator', 'Simulation is not running');
      return;
    }
    
    this.isRunning = false;
    this.isPaused = false;
    
    // Emit stop event
    this.emit('simulationEnd', {
      time: this.currentTime
    });
    
    this.logger.info('simulator', 'Simulation stopped');
  }
  
  /**
   * Pause the simulation
   */
  pause() {
    if (!this.isRunning || this.isPaused) {
      this.logger.warn('simulator', 'Simulation is not running or already paused');
      return;
    }
    
    this.isPaused = true;
    
    // Emit pause event
    this.emit('simulationPause', {
      time: this.currentTime
    });
    
    this.logger.info('simulator', 'Simulation paused');
  }
  
  /**
   * Resume the simulation
   */
  resume() {
    if (!this.isRunning || !this.isPaused) {
      this.logger.warn('simulator', 'Simulation is not running or not paused');
      return;
    }
    
    this.isPaused = false;
    
    // Emit resume event
    this.emit('simulationResume', {
      time: this.currentTime
    });
    
    this.logger.info('simulator', 'Simulation resumed');
  }
  
  /**
   * Step the simulation
   * @param {number} minutes - Number of minutes to step
   */
  step(minutes = 1) {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    // Update time
    this.currentTime += minutes;
    
    // Check if simulation is complete
    if (this.currentTime >= this.config.duration_days * 24 * 60) {
      this.stop();
      return;
    }
    
    // Generate patient arrivals
    this.generatePatientArrivals(minutes);
    
    // Emit step event
    this.emit('simulationStep', {
      time: this.currentTime,
      step: minutes
    });
  }
  
  /**
   * Generate patient arrivals
   * @param {number} minutes - Number of minutes to generate arrivals for
   */
  generatePatientArrivals(minutes) {
    // Determine arrival rate based on time of day
    const hour = Math.floor(this.currentTime / 60) % 24;
    let arrivalRate;
    
    if (hour >= 8 && hour < 12) {
      arrivalRate = this.config.arrival_rates.morning;
    } else if (hour >= 12 && hour < 16) {
      arrivalRate = this.config.arrival_rates.afternoon;
    } else if (hour >= 16 && hour < 22) {
      arrivalRate = this.config.arrival_rates.evening;
    } else {
      arrivalRate = this.config.arrival_rates.night;
    }
    
    // Calculate expected arrivals for this time step
    const expectedArrivals = (arrivalRate / 60) * minutes;
    
    // Generate random number of arrivals using Poisson distribution
    const arrivals = this.poissonRandom(expectedArrivals);
    
    // Generate patients
    for (let i = 0; i < arrivals; i++) {
      this.generatePatient();
    }
  }
  
  /**
   * Generate a patient
   */
  generatePatient() {
    // Generate patient ID
    const patientId = `P${++this.patientCounter}`;
    
    // Generate acuity level based on distribution
    const acuityLevel = this.generateAcuityLevel();
    
    // Generate age
    const age = this.generateAge();
    
    // Generate comorbidities
    const comorbidities = this.generateComorbidities(age, acuityLevel);
    
    // Create patient object
    const patient = {
      id: patientId,
      acuityLevel,
      age,
      comorbidities,
      arrivalTime: this.currentTime,
      status: 'arrived',
      currentLocation: null,
      currentBed: null,
      treatmentPath: [],
      requiresVentilation: acuityLevel === 1 && Math.random() < 0.7,
      requiresIsolation: Math.random() < 0.1,
      requiresPrivateRoom: Math.random() < 0.2
    };
    
    // Add patient to simulator
    this.patients.set(patientId, patient);
    
    // Emit patient arrival event
    this.emit('patientArrival', {
      patient,
      time: this.currentTime
    });
    
    // Admit patient to ED
    const ed = this.departments.get('ed');
    
    if (ed) {
      ed.admitPatient(patient, {
        time: this.currentTime,
        speedFactor: this.options.speedFactor
      });
    }
  }
  
  /**
   * Generate acuity level based on distribution
   * @returns {number} - Acuity level (1-5)
   */
  generateAcuityLevel() {
    const distribution = this.config.acuity_distribution;
    const rand = Math.random();
    
    if (distribution === 'high-acuity') {
      // More high acuity patients
      if (rand < 0.15) return 1; // Critical
      if (rand < 0.35) return 2; // Severe
      if (rand < 0.65) return 3; // Moderate
      if (rand < 0.85) return 4; // Mild
      return 5; // Minor
    } else if (distribution === 'low-acuity') {
      // More low acuity patients
      if (rand < 0.05) return 1; // Critical
      if (rand < 0.15) return 2; // Severe
      if (rand < 0.35) return 3; // Moderate
      if (rand < 0.65) return 4; // Mild
      return 5; // Minor
    } else {
      // Normal distribution
      if (rand < 0.1) return 1; // Critical
      if (rand < 0.25) return 2; // Severe
      if (rand < 0.55) return 3; // Moderate
      if (rand < 0.8) return 4; // Mild
      return 5; // Minor
    }
  }
  
  /**
   * Generate patient age
   * @returns {number} - Age in years
   */
  generateAge() {
    // Generate age with higher probability for elderly and young children
    const rand = Math.random();
    
    if (rand < 0.15) {
      // Young children (0-5)
      return Math.floor(Math.random() * 6);
    } else if (rand < 0.25) {
      // Children (6-17)
      return 6 + Math.floor(Math.random() * 12);
    } else if (rand < 0.65) {
      // Adults (18-64)
      return 18 + Math.floor(Math.random() * 47);
    } else {
      // Elderly (65+)
      return 65 + Math.floor(Math.random() * 36);
    }
  }
  
  /**
   * Generate comorbidities
   * @param {number} age - Patient age
   * @param {number} acuityLevel - Patient acuity level
   * @returns {Array} - Array of comorbidities
   */
  generateComorbidities(age, acuityLevel) {
    const comorbidities = [];
    const comorbidityCount = this.poissonRandom(Math.max(0, 6 - acuityLevel) * 0.5);
    
    const possibleComorbidities = [
      { name: 'Hypertension', severity: 2 },
      { name: 'Diabetes', severity: 3 },
      { name: 'COPD', severity: 4 },
      { name: 'Asthma', severity: 3 },
      { name: 'Heart Disease', severity: 4 },
      { name: 'Kidney Disease', severity: 4 },
      { name: 'Liver Disease', severity: 4 },
      { name: 'Cancer', severity: 5 },
      { name: 'Stroke', severity: 5 },
      { name: 'Obesity', severity: 3 },
      { name: 'Infectious Disease', severity: 4 },
      { name: 'Immunocompromised', severity: 5 }
    ];
    
    // Add age-related comorbidities
    if (age >= 65) {
      possibleComorbidities.push({ name: 'Dementia', severity: 4 });
      possibleComorbidities.push({ name: 'Osteoporosis', severity: 3 });
      possibleComorbidities.push({ name: 'Arthritis', severity: 3 });
    } else if (age <= 5) {
      possibleComorbidities.push({ name: 'Congenital Condition', severity: 4 });
      possibleComorbidities.push({ name: 'Developmental Delay', severity: 3 });
    }
    
    // Randomly select comorbidities
    for (let i = 0; i < comorbidityCount; i++) {
      const index = Math.floor(Math.random() * possibleComorbidities.length);
      const comorbidity = possibleComorbidities[index];
      
      // Check if already added
      if (!comorbidities.some(c => c.name === comorbidity.name)) {
        comorbidities.push(comorbidity);
      }
    }
    
    return comorbidities;
  }
  
  /**
   * Generate random number from Poisson distribution
   * @param {number} lambda - Expected value
   * @returns {number} - Random number
   */
  poissonRandom(lambda) {
    if (lambda <= 0) {
      return 0;
    }
    
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
   * Get patient count
   * @returns {number} - Number of patients in the system
   */
  getPatientCount() {
    return this.patients.size;
  }
  
  /**
   * Get patients
   * @returns {Array} - Array of patients in the system
   */
  getPatients() {
    return Array.from(this.patients.values());
  }
  
  /**
   * Get department
   * @param {string} departmentId - Department ID
   * @returns {Object|null} - Department or null if not found
   */
  getDepartment(departmentId) {
    return this.departments.get(departmentId) || null;
  }
  
  /**
   * Get all departments
   * @returns {Array} - Array of departments
   */
  getAllDepartments() {
    return Array.from(this.departments.values());
  }
  
  /**
   * Get simulation statistics
   * @returns {Object} - Simulation statistics
   */
  getStatistics() {
    return {
      currentTime: this.currentTime,
      totalPatients: this.patients.size,
      departmentManager: this.departmentManager.getStatistics()
    };
  }
}

// Export the class
export default HospitalDepartmentSimulator;
