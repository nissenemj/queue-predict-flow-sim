/**
 * Ward.js
 * Hospital Ward implementation
 */

import Department from './Department.js';

/**
 * Ward class
 * Specialized department for inpatient care
 */
class Ward extends Department {
  /**
   * Constructor for the Ward class
   * @param {Object} config - Department configuration
   * @param {Object} options - Department options
   */
  constructor(config, options = {}) {
    // Set default values for Ward
    const wardConfig = {
      id: config.id || 'ward',
      name: config.name || 'Inpatient Ward',
      type: 'ward',
      capacity: config.capacity || 100,
      beds: config.beds || 100,
      staff: config.staff || {
        doctor: 10,
        nurse: 30,
        aide: 15
      },
      equipment: config.equipment || {
        monitor: 50,
        infusion_pump: 80,
        wheelchair: 20
      },
      ...config
    };
    
    super(wardConfig, options);
    
    // Ward-specific properties
    this.privateRooms = new Map();
    this.sharedRooms = new Map();
    this.dischargeQueue = [];
    this.roundsSchedule = [];
    
    // Initialize Ward-specific resources
    this.initializeWardResources(wardConfig);
    
    // Initialize Ward-specific workflows
    this.initializeWardWorkflows(wardConfig);
  }
  
  /**
   * Initialize Ward-specific resources
   * @param {Object} config - Department configuration
   */
  initializeWardResources(config) {
    // Initialize private rooms
    const privateRooms = config.privateRooms || 20;
    
    for (let i = 0; i < privateRooms; i++) {
      const room = {
        id: `${this.id}_private_${i + 1}`,
        type: 'private_room',
        department: this.id,
        occupied: false,
        patient: null,
        status: 'available',
        equipment: ['monitor', 'infusion_pump']
      };
      
      this.privateRooms.set(room.id, room);
    }
    
    this.logger.debug('department', `Initialized ${privateRooms} private rooms`, null, { departmentId: this.id });
    
    // Initialize shared rooms
    const sharedRooms = config.sharedRooms || 20;
    const bedsPerRoom = config.bedsPerRoom || 4;
    
    for (let i = 0; i < sharedRooms; i++) {
      const room = {
        id: `${this.id}_shared_${i + 1}`,
        type: 'shared_room',
        department: this.id,
        capacity: bedsPerRoom,
        occupancy: 0,
        patients: [],
        status: 'available',
        equipment: ['monitor']
      };
      
      this.sharedRooms.set(room.id, room);
    }
    
    this.logger.debug('department', `Initialized ${sharedRooms} shared rooms with ${bedsPerRoom} beds each`, null, { departmentId: this.id });
    
    // Initialize rounds schedule
    this.initializeRoundsSchedule();
  }
  
  /**
   * Initialize rounds schedule
   */
  initializeRoundsSchedule() {
    // Schedule morning rounds
    this.roundsSchedule.push({
      name: 'Morning Rounds',
      startHour: 8,
      duration: 2, // hours
      resourceRequirements: { doctor: 1, nurse: 1 },
      patientsPerHour: 6
    });
    
    // Schedule evening rounds
    this.roundsSchedule.push({
      name: 'Evening Rounds',
      startHour: 16,
      duration: 2, // hours
      resourceRequirements: { doctor: 1, nurse: 1 },
      patientsPerHour: 6
    });
  }
  
  /**
   * Initialize Ward-specific workflows
   * @param {Object} config - Department configuration
   */
  initializeWardWorkflows(config) {
    // Standard inpatient workflow
    this.workflows.set('standard', {
      name: 'Standard Inpatient Workflow',
      steps: [
        {
          name: 'Admission',
          resourceRequirements: { nurse: 1, bed: 1 },
          duration: 30, // minutes
          next: 'Initial Assessment'
        },
        {
          name: 'Initial Assessment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 45, // minutes
          next: 'Care Plan Development'
        },
        {
          name: 'Care Plan Development',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 30, // minutes
          next: 'Treatment'
        },
        {
          name: 'Treatment',
          resourceRequirements: { nurse: 1, bed: 1 },
          duration: 720, // minutes (12 hours)
          next: 'Rounds'
        },
        {
          name: 'Rounds',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 15, // minutes
          next: 'Continued Care'
        },
        {
          name: 'Continued Care',
          resourceRequirements: { nurse: 1, bed: 1 },
          duration: 720, // minutes (12 hours)
          next: 'Discharge Planning'
        },
        {
          name: 'Discharge Planning',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 60, // minutes
          next: 'Discharge'
        },
        {
          name: 'Discharge',
          resourceRequirements: { nurse: 1 },
          duration: 45, // minutes
          next: null
        }
      ]
    });
    
    // Short stay workflow
    this.workflows.set('short_stay', {
      name: 'Short Stay Workflow',
      steps: [
        {
          name: 'Admission',
          resourceRequirements: { nurse: 1, bed: 1 },
          duration: 30, // minutes
          next: 'Assessment'
        },
        {
          name: 'Assessment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 30, // minutes
          next: 'Treatment'
        },
        {
          name: 'Treatment',
          resourceRequirements: { nurse: 1, bed: 1 },
          duration: 240, // minutes (4 hours)
          next: 'Discharge Planning'
        },
        {
          name: 'Discharge Planning',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 30, // minutes
          next: 'Discharge'
        },
        {
          name: 'Discharge',
          resourceRequirements: { nurse: 1 },
          duration: 30, // minutes
          next: null
        }
      ]
    });
    
    // Extended care workflow
    this.workflows.set('extended_care', {
      name: 'Extended Care Workflow',
      steps: [
        {
          name: 'Admission',
          resourceRequirements: { nurse: 1, bed: 1 },
          duration: 45, // minutes
          next: 'Comprehensive Assessment'
        },
        {
          name: 'Comprehensive Assessment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 60, // minutes
          next: 'Care Plan Development'
        },
        {
          name: 'Care Plan Development',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 45, // minutes
          next: 'Initial Treatment'
        },
        {
          name: 'Initial Treatment',
          resourceRequirements: { nurse: 1, bed: 1 },
          duration: 720, // minutes (12 hours)
          next: 'Daily Rounds'
        },
        {
          name: 'Daily Rounds',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 20, // minutes
          next: 'Continued Treatment'
        },
        {
          name: 'Continued Treatment',
          resourceRequirements: { nurse: 1, bed: 1 },
          duration: 1440, // minutes (24 hours)
          next: 'Progress Assessment'
        },
        {
          name: 'Progress Assessment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 30, // minutes
          next: 'Rehabilitation'
        },
        {
          name: 'Rehabilitation',
          resourceRequirements: { nurse: 1, aide: 1, bed: 1 },
          duration: 120, // minutes (2 hours)
          next: 'Discharge Planning'
        },
        {
          name: 'Discharge Planning',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 60, // minutes
          next: 'Discharge'
        },
        {
          name: 'Discharge',
          resourceRequirements: { nurse: 1, aide: 1 },
          duration: 60, // minutes
          next: null
        }
      ]
    });
    
    // Set default workflow to standard
    this.workflows.set('default', this.workflows.get('standard'));
  }
  
  /**
   * Admit a patient to the Ward
   * @param {Object} patient - Patient to admit
   * @param {Object} options - Admission options
   * @returns {boolean} - Whether the patient was admitted
   */
  admitPatient(patient, options = {}) {
    // Determine appropriate workflow based on expected length of stay
    let workflow = 'standard';
    
    if (patient.expectedLOS && patient.expectedLOS < 1) {
      workflow = 'short_stay';
    } else if (patient.expectedLOS && patient.expectedLOS > 5) {
      workflow = 'extended_care';
    }
    
    // Override workflow if specified
    if (options.workflow) {
      workflow = options.workflow;
    }
    
    // Determine room type
    let roomType = 'shared';
    
    // Patients with certain conditions may need private rooms
    if (patient.requiresPrivateRoom || 
        (patient.comorbidities && patient.comorbidities.some(c => 
          c.name === 'Infectious Disease' || c.severity >= 4))) {
      roomType = 'private';
    }
    
    // Check room availability
    if (roomType === 'private') {
      let privateRoomAvailable = false;
      
      for (const [id, room] of this.privateRooms.entries()) {
        if (!room.occupied) {
          privateRoomAvailable = true;
          break;
        }
      }
      
      if (!privateRoomAvailable && !options.force) {
        // No private rooms available, try shared if not infectious
        if (patient.comorbidities && patient.comorbidities.some(c => c.name === 'Infectious Disease')) {
          this.logger.warn('department', `No private rooms available for infectious patient ${patient.id}`, patient);
          return false;
        }
        
        roomType = 'shared';
      }
    }
    
    if (roomType === 'shared') {
      let sharedRoomAvailable = false;
      
      for (const [id, room] of this.sharedRooms.entries()) {
        if (room.occupancy < room.capacity) {
          sharedRoomAvailable = true;
          break;
        }
      }
      
      if (!sharedRoomAvailable && !options.force) {
        this.logger.warn('department', `No shared rooms available for patient ${patient.id}`, patient);
        return false;
      }
    }
    
    // Add workflow and room type to options
    const admitOptions = {
      ...options,
      workflow,
      roomType
    };
    
    // Call parent method to admit patient
    const admitted = super.admitPatient(patient, admitOptions);
    
    if (admitted) {
      // Assign to appropriate room
      this.assignRoom(patient, roomType);
    }
    
    return admitted;
  }
  
  /**
   * Assign a room to a patient
   * @param {Object} patient - Patient
   * @param {string} roomType - Room type ('private' or 'shared')
   * @returns {Object|null} - Assigned room or null if none available
   */
  assignRoom(patient, roomType) {
    if (roomType === 'private') {
      // Find available private room
      for (const [id, room] of this.privateRooms.entries()) {
        if (!room.occupied) {
          // Assign room
          room.occupied = true;
          room.patient = patient.id;
          room.status = 'occupied';
          
          // Update patient data
          const patientData = this.patients.get(patient.id);
          patientData.room = id;
          patientData.roomType = 'private';
          
          this.logger.debug('department', `Assigned private room ${id} to patient ${patient.id}`, patient);
          
          return room;
        }
      }
    } else {
      // Find available shared room
      for (const [id, room] of this.sharedRooms.entries()) {
        if (room.occupancy < room.capacity) {
          // Assign room
          room.occupancy++;
          room.patients.push(patient.id);
          
          if (room.occupancy === room.capacity) {
            room.status = 'full';
          } else {
            room.status = 'partially_occupied';
          }
          
          // Update patient data
          const patientData = this.patients.get(patient.id);
          patientData.room = id;
          patientData.roomType = 'shared';
          
          this.logger.debug('department', `Assigned shared room ${id} to patient ${patient.id}`, patient);
          
          return room;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Process workflow step for a patient
   * @param {Object} patient - Patient
   * @param {Object} options - Process options
   */
  processWorkflowStep(patient, options = {}) {
    // Check if patient is in the department
    if (!this.patients.has(patient.id)) {
      this.logger.warn('department', `Patient ${patient.id} is not in department ${this.id}`, patient);
      return;
    }
    
    const patientData = this.patients.get(patient.id);
    const workflowId = patientData.workflow || 'default';
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      this.logger.error('department', `Workflow ${workflowId} not found for patient ${patient.id}`, patient);
      return;
    }
    
    // Get current step
    const stepIndex = patientData.currentStep;
    
    if (stepIndex >= workflow.steps.length) {
      // Workflow complete, discharge patient
      this.completePatientWorkflow(patient, options);
      return;
    }
    
    const step = workflow.steps[stepIndex];
    
    // Special handling for rounds
    if (step.name === 'Rounds' || step.name === 'Daily Rounds') {
      // Check if it's time for rounds
      const currentHour = Math.floor((options.time || Date.now()) / (60 * 60 * 1000)) % 24;
      let roundsScheduled = false;
      
      for (const rounds of this.roundsSchedule) {
        if (currentHour >= rounds.startHour && currentHour < rounds.startHour + rounds.duration) {
          roundsScheduled = true;
          break;
        }
      }
      
      if (!roundsScheduled) {
        // Not time for rounds, wait
        this.logger.debug('department', `Not time for rounds for patient ${patient.id}, waiting`, patient);
        
        // Schedule retry in 1 hour
        setTimeout(() => {
          this.processWorkflowStep(patient, {
            ...options,
            time: (options.time || Date.now()) + 60 * 60 * 1000
          });
        }, 60 * 60 * 1000 / (options.speedFactor || 1)); // Adjust for simulation speed
        
        return;
      }
    }
    
    // Check if resources are available for this step
    const resourcesAvailable = this.checkResourceAvailability(step.resourceRequirements);
    
    if (!resourcesAvailable) {
      // Resources not available, wait
      this.logger.debug('department', `Resources not available for patient ${patient.id}, step ${step.name}`, patient);
      
      // Schedule retry
      setTimeout(() => {
        this.processWorkflowStep(patient, options);
      }, 1000); // Retry after 1 second
      
      return;
    }
    
    // Allocate resources
    const allocatedResources = this.allocateResources(patient, step.resourceRequirements);
    
    // Update patient status
    patientData.status = step.name.toLowerCase();
    
    // Update patient treatment path
    if (!patient.treatmentPath) {
      patient.treatmentPath = [];
    }
    
    patient.treatmentPath.push({
      department: this.id,
      action: step.name,
      time: options.time || Date.now()
    });
    
    // Emit event
    this.emit('patientStep', {
      patient,
      department: this,
      step: step.name,
      resources: allocatedResources,
      time: options.time || Date.now()
    });
    
    this.logger.info('department', `Patient ${patient.id} starting step ${step.name}`, patient, {
      departmentId: this.id,
      step: step.name
    });
    
    // Schedule step completion
    setTimeout(() => {
      this.completeWorkflowStep(patient, step, allocatedResources, {
        ...options,
        time: (options.time || Date.now()) + step.duration * 60 * 1000
      });
    }, step.duration * 60 * 1000 / (options.speedFactor || 1)); // Adjust for simulation speed
  }
  
  /**
   * Complete workflow step for a patient
   * @param {Object} patient - Patient
   * @param {Object} step - Workflow step
   * @param {Object} resources - Allocated resources
   * @param {Object} options - Completion options
   */
  completeWorkflowStep(patient, step, resources, options = {}) {
    // Check if patient is still in the department
    if (!this.patients.has(patient.id)) {
      // Patient has been discharged or transferred
      this.releaseResources(resources);
      return;
    }
    
    const patientData = this.patients.get(patient.id);
    
    // Release resources
    this.releaseResources(resources);
    
    // Update patient treatment path
    if (!patient.treatmentPath) {
      patient.treatmentPath = [];
    }
    
    patient.treatmentPath.push({
      department: this.id,
      action: `${step.name} completed`,
      time: options.time || Date.now()
    });
    
    // Emit event
    this.emit('patientStepCompleted', {
      patient,
      department: this,
      step: step.name,
      time: options.time || Date.now()
    });
    
    this.logger.info('department', `Patient ${patient.id} completed step ${step.name}`, patient, {
      departmentId: this.id,
      step: step.name
    });
    
    // Move to next step
    if (step.next) {
      // Increment step index
      patientData.currentStep++;
      
      // Process next step
      this.processWorkflowStep(patient, options);
    } else {
      // Workflow complete
      this.completePatientWorkflow(patient, options);
    }
  }
  
  /**
   * Complete patient workflow
   * @param {Object} patient - Patient
   * @param {Object} options - Completion options
   */
  completePatientWorkflow(patient, options = {}) {
    // Check if patient is still in the department
    if (!this.patients.has(patient.id)) {
      return;
    }
    
    const patientData = this.patients.get(patient.id);
    
    // Update patient status
    patientData.status = 'completed';
    
    // Add to discharge queue
    this.dischargeQueue.push({
      patient,
      time: options.time || Date.now()
    });
    
    // Update patient treatment path
    if (!patient.treatmentPath) {
      patient.treatmentPath = [];
    }
    
    patient.treatmentPath.push({
      department: this.id,
      action: 'workflow_completed',
      time: options.time || Date.now()
    });
    
    // Emit event
    this.emit('patientWorkflowCompleted', {
      patient,
      department: this,
      time: options.time || Date.now()
    });
    
    this.logger.info('department', `Patient ${patient.id} completed workflow, added to discharge queue`, patient, {
      departmentId: this.id
    });
    
    // Process discharge queue
    this.processDischargeQueue(options);
  }
  
  /**
   * Process discharge queue
   * @param {Object} options - Process options
   */
  processDischargeQueue(options = {}) {
    // Check if there are patients in the discharge queue
    if (this.dischargeQueue.length === 0) {
      return;
    }
    
    // Check if resources are available for discharge
    const resourcesAvailable = this.checkResourceAvailability({ nurse: 1 });
    
    if (!resourcesAvailable) {
      // Resources not available, wait
      this.logger.debug('department', `Resources not available for discharge, waiting`);
      
      // Schedule retry
      setTimeout(() => {
        this.processDischargeQueue(options);
      }, 1000); // Retry after 1 second
      
      return;
    }
    
    // Get next patient from queue
    const nextDischarge = this.dischargeQueue.shift();
    
    // Discharge patient
    this.dischargePatient(nextDischarge.patient, {
      ...options,
      status: 'discharged',
      destination: null
    });
    
    // Process next patient in queue if any
    if (this.dischargeQueue.length > 0) {
      // Schedule next discharge
      setTimeout(() => {
        this.processDischargeQueue(options);
      }, 15 * 60 * 1000 / (options.speedFactor || 1)); // 15 minutes, adjusted for simulation speed
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
    
    // Release room
    if (patientData.room) {
      if (patientData.roomType === 'private') {
        const room = this.privateRooms.get(patientData.room);
        
        if (room) {
          room.occupied = false;
          room.patient = null;
          room.status = 'available';
        }
      } else if (patientData.roomType === 'shared') {
        const room = this.sharedRooms.get(patientData.room);
        
        if (room) {
          room.occupancy--;
          room.patients = room.patients.filter(id => id !== patient.id);
          
          if (room.occupancy === 0) {
            room.status = 'available';
          } else {
            room.status = 'partially_occupied';
          }
        }
      }
    }
    
    // Call parent method to complete discharge
    return super.dischargePatient(patient, options);
  }
  
  /**
   * Reset department
   */
  reset() {
    // Call parent reset
    super.reset();
    
    // Reset Ward-specific resources
    for (const [id, room] of this.privateRooms.entries()) {
      room.occupied = false;
      room.patient = null;
      room.status = 'available';
    }
    
    for (const [id, room] of this.sharedRooms.entries()) {
      room.occupancy = 0;
      room.patients = [];
      room.status = 'available';
    }
    
    // Clear discharge queue
    this.dischargeQueue = [];
  }
}

// Export the class
export default Ward;
