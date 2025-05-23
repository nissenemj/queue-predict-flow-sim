/**
 * Department.js
 * Base class for hospital departments
 */

import Logger from '../utils/Logger.js';
import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Department class
 * Base class for hospital departments
 */
class Department extends EventEmitter {
  /**
   * Constructor for the Department class
   * @param {Object} config - Department configuration
   * @param {Object} options - Department options
   */
  constructor(config, options = {}) {
    super();
    
    this.id = config.id || 'department';
    this.name = config.name || 'Department';
    this.type = config.type || 'generic';
    this.capacity = config.capacity || 0;
    this.resources = config.resources || {};
    this.config = config;
    this.options = {
      debug: options.debug || false,
      ...options
    };
    
    // Department state
    this.patients = new Map();
    this.waitingList = [];
    this.staff = new Map();
    this.equipment = new Map();
    this.beds = new Map();
    this.stats = {
      totalPatients: 0,
      currentPatients: 0,
      waitingPatients: 0,
      treatedPatients: 0,
      transferredPatients: 0,
      avgWaitTime: 0,
      avgLOS: 0,
      bedUtilization: 0,
      staffUtilization: 0
    };
    
    // Workflow definitions
    this.workflows = new Map();
    
    // Logger
    this.logger = options.logger || new Logger({ level: 'info' });
    
    // Initialize
    this.initialize(config);
  }
  
  /**
   * Initialize the department
   * @param {Object} config - Department configuration
   */
  initialize(config) {
    this.logger.info('department', `Initializing department: ${this.name}`, null, { departmentId: this.id });
    
    // Initialize resources
    this.initializeResources(config);
    
    // Initialize workflows
    this.initializeWorkflows(config);
    
    // Register event handlers
    this.registerEventHandlers();
  }
  
  /**
   * Initialize department resources
   * @param {Object} config - Department configuration
   */
  initializeResources(config) {
    // Initialize beds
    if (config.beds) {
      for (let i = 0; i < config.beds; i++) {
        const bed = {
          id: `${this.id}_bed_${i + 1}`,
          type: 'bed',
          department: this.id,
          occupied: false,
          patient: null,
          status: 'available'
        };
        
        this.beds.set(bed.id, bed);
      }
      
      this.logger.debug('department', `Initialized ${config.beds} beds`, null, { departmentId: this.id });
    }
    
    // Initialize staff
    if (config.staff) {
      for (const staffType in config.staff) {
        const count = config.staff[staffType];
        
        for (let i = 0; i < count; i++) {
          const staff = {
            id: `${this.id}_${staffType}_${i + 1}`,
            type: staffType,
            department: this.id,
            busy: false,
            patient: null,
            status: 'available'
          };
          
          this.staff.set(staff.id, staff);
        }
        
        this.logger.debug('department', `Initialized ${count} ${staffType}`, null, { departmentId: this.id });
      }
    }
    
    // Initialize equipment
    if (config.equipment) {
      for (const equipmentType in config.equipment) {
        const count = config.equipment[equipmentType];
        
        for (let i = 0; i < count; i++) {
          const equipment = {
            id: `${this.id}_${equipmentType}_${i + 1}`,
            type: equipmentType,
            department: this.id,
            inUse: false,
            patient: null,
            status: 'available'
          };
          
          this.equipment.set(equipment.id, equipment);
        }
        
        this.logger.debug('department', `Initialized ${count} ${equipmentType}`, null, { departmentId: this.id });
      }
    }
  }
  
  /**
   * Initialize department workflows
   * @param {Object} config - Department configuration
   */
  initializeWorkflows(config) {
    // Default workflow
    this.workflows.set('default', {
      name: 'Default Workflow',
      steps: [
        {
          name: 'Triage',
          resourceRequirements: { nurse: 1 },
          duration: 10, // minutes
          next: 'Assessment'
        },
        {
          name: 'Assessment',
          resourceRequirements: { doctor: 1, nurse: 1 },
          duration: 20, // minutes
          next: 'Treatment'
        },
        {
          name: 'Treatment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 60, // minutes
          next: 'Discharge'
        },
        {
          name: 'Discharge',
          resourceRequirements: { nurse: 1 },
          duration: 15, // minutes
          next: null
        }
      ]
    });
    
    // Add custom workflows from config
    if (config.workflows) {
      for (const [workflowId, workflow] of Object.entries(config.workflows)) {
        this.workflows.set(workflowId, workflow);
      }
    }
    
    this.logger.debug('department', `Initialized ${this.workflows.size} workflows`, null, { departmentId: this.id });
  }
  
  /**
   * Register event handlers
   */
  registerEventHandlers() {
    // No default event handlers
  }
  
  /**
   * Admit a patient to the department
   * @param {Object} patient - Patient to admit
   * @param {Object} options - Admission options
   * @returns {boolean} - Whether the patient was admitted
   */
  admitPatient(patient, options = {}) {
    // Check if patient is already in the department
    if (this.patients.has(patient.id)) {
      this.logger.warn('department', `Patient ${patient.id} is already in department ${this.id}`, patient);
      return false;
    }
    
    // Check if department has capacity
    if (this.isFull() && !options.force) {
      this.logger.warn('department', `Department ${this.id} is full, patient ${patient.id} added to waiting list`, patient);
      
      // Add to waiting list
      this.waitingList.push({
        patient,
        arrivalTime: options.time || Date.now(),
        priority: this.calculatePatientPriority(patient)
      });
      
      // Sort waiting list by priority
      this.sortWaitingList();
      
      // Update stats
      this.stats.waitingPatients = this.waitingList.length;
      
      // Emit event
      this.emit('patientWaiting', {
        patient,
        department: this,
        time: options.time || Date.now()
      });
      
      return false;
    }
    
    // Assign a bed if available
    const bed = this.findAvailableBed();
    
    if (bed) {
      // Occupy the bed
      bed.occupied = true;
      bed.patient = patient.id;
      bed.status = 'occupied';
      
      // Update patient
      patient.currentLocation = this.id;
      patient.currentBed = bed.id;
      patient.status = 'admitted';
      patient.admissionTime = options.time || Date.now();
      
      if (!patient.treatmentPath) {
        patient.treatmentPath = [];
      }
      
      patient.treatmentPath.push({
        department: this.id,
        action: 'admitted',
        time: options.time || Date.now()
      });
      
      // Add patient to department
      this.patients.set(patient.id, {
        patient,
        admissionTime: options.time || Date.now(),
        bed: bed.id,
        workflow: options.workflow || 'default',
        currentStep: 0,
        status: 'admitted'
      });
      
      // Update stats
      this.stats.totalPatients++;
      this.stats.currentPatients = this.patients.size;
      this.stats.bedUtilization = this.calculateBedUtilization();
      
      // Emit event
      this.emit('patientAdmitted', {
        patient,
        department: this,
        bed,
        time: options.time || Date.now()
      });
      
      this.logger.info('department', `Patient ${patient.id} admitted to department ${this.id}`, patient, {
        departmentId: this.id,
        bedId: bed.id
      });
      
      // Start patient workflow
      this.startPatientWorkflow(patient, options);
      
      return true;
    } else {
      // No beds available
      this.logger.warn('department', `No beds available in department ${this.id}, patient ${patient.id} added to waiting list`, patient);
      
      // Add to waiting list
      this.waitingList.push({
        patient,
        arrivalTime: options.time || Date.now(),
        priority: this.calculatePatientPriority(patient)
      });
      
      // Sort waiting list by priority
      this.sortWaitingList();
      
      // Update stats
      this.stats.waitingPatients = this.waitingList.length;
      
      // Emit event
      this.emit('patientWaiting', {
        patient,
        department: this,
        time: options.time || Date.now()
      });
      
      return false;
    }
  }
  
  /**
   * Discharge a patient from the department
   * @param {Object} patient - Patient to discharge
   * @param {Object} options - Discharge options
   * @returns {boolean} - Whether the patient was discharged
   */
  dischargePatient(patient, options = {}) {
    // Check if patient is in the department
    if (!this.patients.has(patient.id)) {
      this.logger.warn('department', `Patient ${patient.id} is not in department ${this.id}`, patient);
      return false;
    }
    
    const patientData = this.patients.get(patient.id);
    
    // Release bed
    if (patientData.bed) {
      const bed = this.beds.get(patientData.bed);
      
      if (bed) {
        bed.occupied = false;
        bed.patient = null;
        bed.status = 'available';
      }
    }
    
    // Update patient
    patient.currentLocation = options.destination || null;
    patient.currentBed = null;
    patient.status = options.status || 'discharged';
    patient.dischargeTime = options.time || Date.now();
    
    if (!patient.treatmentPath) {
      patient.treatmentPath = [];
    }
    
    patient.treatmentPath.push({
      department: this.id,
      action: 'discharged',
      destination: options.destination || null,
      time: options.time || Date.now()
    });
    
    // Calculate length of stay
    const los = (patient.dischargeTime - patientData.admissionTime) / (1000 * 60); // in minutes
    
    // Update stats
    this.stats.currentPatients = this.patients.size - 1;
    this.stats.treatedPatients++;
    this.stats.avgLOS = (this.stats.avgLOS * (this.stats.treatedPatients - 1) + los) / this.stats.treatedPatients;
    this.stats.bedUtilization = this.calculateBedUtilization();
    
    // Remove patient from department
    this.patients.delete(patient.id);
    
    // Emit event
    this.emit('patientDischarged', {
      patient,
      department: this,
      destination: options.destination || null,
      time: options.time || Date.now()
    });
    
    this.logger.info('department', `Patient ${patient.id} discharged from department ${this.id}`, patient, {
      departmentId: this.id,
      destination: options.destination || null
    });
    
    // Process waiting list
    this.processWaitingList(options);
    
    return true;
  }
  
  /**
   * Transfer a patient to another department
   * @param {Object} patient - Patient to transfer
   * @param {Object} targetDepartment - Target department
   * @param {Object} options - Transfer options
   * @returns {boolean} - Whether the patient was transferred
   */
  transferPatient(patient, targetDepartment, options = {}) {
    // Check if patient is in the department
    if (!this.patients.has(patient.id)) {
      this.logger.warn('department', `Patient ${patient.id} is not in department ${this.id}`, patient);
      return false;
    }
    
    // Check if target department exists
    if (!targetDepartment) {
      this.logger.error('department', `Target department is null for patient ${patient.id}`, patient);
      return false;
    }
    
    // Try to admit patient to target department
    const admitted = targetDepartment.admitPatient(patient, {
      time: options.time || Date.now(),
      workflow: options.workflow || 'default',
      force: options.force || false
    });
    
    if (admitted) {
      // Discharge patient from this department
      this.dischargePatient(patient, {
        destination: targetDepartment.id,
        status: 'transferred',
        time: options.time || Date.now()
      });
      
      // Update stats
      this.stats.transferredPatients++;
      
      // Emit event
      this.emit('patientTransferred', {
        patient,
        fromDepartment: this,
        toDepartment: targetDepartment,
        time: options.time || Date.now()
      });
      
      this.logger.info('department', `Patient ${patient.id} transferred from department ${this.id} to ${targetDepartment.id}`, patient, {
        fromDepartmentId: this.id,
        toDepartmentId: targetDepartment.id
      });
      
      return true;
    } else {
      this.logger.warn('department', `Failed to transfer patient ${patient.id} from department ${this.id} to ${targetDepartment.id}`, patient);
      return false;
    }
  }
  
  /**
   * Start patient workflow
   * @param {Object} patient - Patient
   * @param {Object} options - Workflow options
   */
  startPatientWorkflow(patient, options = {}) {
    // Check if patient is in the department
    if (!this.patients.has(patient.id)) {
      this.logger.warn('department', `Patient ${patient.id} is not in department ${this.id}`, patient);
      return;
    }
    
    const patientData = this.patients.get(patient.id);
    const workflowId = options.workflow || patientData.workflow || 'default';
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      this.logger.error('department', `Workflow ${workflowId} not found for patient ${patient.id}`, patient);
      return;
    }
    
    // Reset workflow state
    patientData.workflow = workflowId;
    patientData.currentStep = 0;
    patientData.status = 'in_progress';
    
    // Start first step
    this.processWorkflowStep(patient, options);
  }
  
  /**
   * Process workflow step for a patient
   * @param {Object} patient - Patient
   * @param {Object} options - Process options
   */
  processWorkflowStep(patient, options = {}) {
    // To be implemented by subclasses
    this.logger.debug('department', `Processing workflow step for patient ${patient.id}`, patient);
  }
  
  /**
   * Process waiting list
   * @param {Object} options - Process options
   */
  processWaitingList(options = {}) {
    // Check if there are patients waiting
    if (this.waitingList.length === 0) {
      return;
    }
    
    // Check if there are beds available
    if (this.getAvailableBeds() === 0) {
      return;
    }
    
    // Sort waiting list by priority
    this.sortWaitingList();
    
    // Get next patient
    const nextPatient = this.waitingList.shift();
    
    // Update stats
    this.stats.waitingPatients = this.waitingList.length;
    
    // Admit patient
    this.admitPatient(nextPatient.patient, {
      time: options.time || Date.now(),
      workflow: options.workflow || 'default'
    });
    
    // Calculate wait time
    const waitTime = ((options.time || Date.now()) - nextPatient.arrivalTime) / (1000 * 60); // in minutes
    
    // Update stats
    this.stats.avgWaitTime = (this.stats.avgWaitTime * (this.stats.totalPatients - 1) + waitTime) / this.stats.totalPatients;
  }
  
  /**
   * Sort waiting list by priority
   */
  sortWaitingList() {
    this.waitingList.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Calculate patient priority
   * @param {Object} patient - Patient
   * @returns {number} - Priority score
   */
  calculatePatientPriority(patient) {
    // Base priority on acuity level (1-5, where 1 is most acute)
    const acuityPriority = 6 - patient.acuityLevel;
    
    // Additional factors can be considered
    return acuityPriority;
  }
  
  /**
   * Find available bed
   * @returns {Object|null} - Available bed or null if none available
   */
  findAvailableBed() {
    for (const [id, bed] of this.beds.entries()) {
      if (!bed.occupied) {
        return bed;
      }
    }
    
    return null;
  }
  
  /**
   * Find available staff of a specific type
   * @param {string} type - Staff type
   * @returns {Object|null} - Available staff or null if none available
   */
  findAvailableStaff(type) {
    for (const [id, staff] of this.staff.entries()) {
      if (staff.type === type && !staff.busy) {
        return staff;
      }
    }
    
    return null;
  }
  
  /**
   * Find available equipment of a specific type
   * @param {string} type - Equipment type
   * @returns {Object|null} - Available equipment or null if none available
   */
  findAvailableEquipment(type) {
    for (const [id, equipment] of this.equipment.entries()) {
      if (equipment.type === type && !equipment.inUse) {
        return equipment;
      }
    }
    
    return null;
  }
  
  /**
   * Check if department is full
   * @returns {boolean} - Whether the department is full
   */
  isFull() {
    return this.getAvailableBeds() === 0;
  }
  
  /**
   * Get number of available beds
   * @returns {number} - Number of available beds
   */
  getAvailableBeds() {
    let count = 0;
    
    for (const [id, bed] of this.beds.entries()) {
      if (!bed.occupied) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Calculate bed utilization
   * @returns {number} - Bed utilization (0-1)
   */
  calculateBedUtilization() {
    if (this.beds.size === 0) {
      return 0;
    }
    
    let occupiedBeds = 0;
    
    for (const [id, bed] of this.beds.entries()) {
      if (bed.occupied) {
        occupiedBeds++;
      }
    }
    
    return occupiedBeds / this.beds.size;
  }
  
  /**
   * Get department statistics
   * @returns {Object} - Department statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      id: this.id,
      name: this.name,
      type: this.type,
      capacity: this.capacity,
      currentPatients: this.patients.size,
      waitingPatients: this.waitingList.length,
      availableBeds: this.getAvailableBeds(),
      totalBeds: this.beds.size
    };
  }
  
  /**
   * Reset department
   */
  reset() {
    // Clear patients
    this.patients.clear();
    
    // Clear waiting list
    this.waitingList = [];
    
    // Reset beds
    for (const [id, bed] of this.beds.entries()) {
      bed.occupied = false;
      bed.patient = null;
      bed.status = 'available';
    }
    
    // Reset staff
    for (const [id, staff] of this.staff.entries()) {
      staff.busy = false;
      staff.patient = null;
      staff.status = 'available';
    }
    
    // Reset equipment
    for (const [id, equipment] of this.equipment.entries()) {
      equipment.inUse = false;
      equipment.patient = null;
      equipment.status = 'available';
    }
    
    // Reset stats
    this.stats = {
      totalPatients: 0,
      currentPatients: 0,
      waitingPatients: 0,
      treatedPatients: 0,
      transferredPatients: 0,
      avgWaitTime: 0,
      avgLOS: 0,
      bedUtilization: 0,
      staffUtilization: 0
    };
    
    this.logger.info('department', `Department ${this.id} reset`, null, { departmentId: this.id });
  }
}

// Export the class
export default Department;
