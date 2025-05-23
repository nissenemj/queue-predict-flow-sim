/**
 * EmergencyDepartment.js
 * Emergency Department (ED) implementation
 */

import Department from './Department.js';

/**
 * Emergency Department class
 * Specialized department for emergency care
 */
class EmergencyDepartment extends Department {
  /**
   * Constructor for the EmergencyDepartment class
   * @param {Object} config - Department configuration
   * @param {Object} options - Department options
   */
  constructor(config, options = {}) {
    // Set default values for ED
    const edConfig = {
      id: config.id || 'ed',
      name: config.name || 'Emergency Department',
      type: 'emergency',
      capacity: config.capacity || 50,
      beds: config.beds || 50,
      staff: config.staff || {
        doctor: 10,
        nurse: 20,
        technician: 5
      },
      equipment: config.equipment || {
        monitor: 50,
        ventilator: 10,
        defibrillator: 5,
        ultrasound: 2,
        xray: 1
      },
      ...config
    };
    
    super(edConfig, options);
    
    // ED-specific properties
    this.triageQueue = [];
    this.resuscitationBays = new Map();
    this.traumaBays = new Map();
    this.fastTrack = new Map();
    
    // Initialize ED-specific resources
    this.initializeEDResources(edConfig);
    
    // Initialize ED-specific workflows
    this.initializeEDWorkflows(edConfig);
  }
  
  /**
   * Initialize ED-specific resources
   * @param {Object} config - Department configuration
   */
  initializeEDResources(config) {
    // Initialize resuscitation bays
    const resuscBays = config.resuscitationBays || 2;
    
    for (let i = 0; i < resuscBays; i++) {
      const bay = {
        id: `${this.id}_resus_${i + 1}`,
        type: 'resuscitation_bay',
        department: this.id,
        occupied: false,
        patient: null,
        status: 'available',
        equipment: ['monitor', 'ventilator', 'defibrillator']
      };
      
      this.resuscitationBays.set(bay.id, bay);
    }
    
    this.logger.debug('department', `Initialized ${resuscBays} resuscitation bays`, null, { departmentId: this.id });
    
    // Initialize trauma bays
    const traumaBays = config.traumaBays || 4;
    
    for (let i = 0; i < traumaBays; i++) {
      const bay = {
        id: `${this.id}_trauma_${i + 1}`,
        type: 'trauma_bay',
        department: this.id,
        occupied: false,
        patient: null,
        status: 'available',
        equipment: ['monitor', 'ultrasound']
      };
      
      this.traumaBays.set(bay.id, bay);
    }
    
    this.logger.debug('department', `Initialized ${traumaBays} trauma bays`, null, { departmentId: this.id });
    
    // Initialize fast track
    const fastTrackBeds = config.fastTrackBeds || 10;
    
    for (let i = 0; i < fastTrackBeds; i++) {
      const bed = {
        id: `${this.id}_fasttrack_${i + 1}`,
        type: 'fast_track_bed',
        department: this.id,
        occupied: false,
        patient: null,
        status: 'available'
      };
      
      this.fastTrack.set(bed.id, bed);
    }
    
    this.logger.debug('department', `Initialized ${fastTrackBeds} fast track beds`, null, { departmentId: this.id });
  }
  
  /**
   * Initialize ED-specific workflows
   * @param {Object} config - Department configuration
   */
  initializeEDWorkflows(config) {
    // Resuscitation workflow
    this.workflows.set('resuscitation', {
      name: 'Resuscitation Workflow',
      steps: [
        {
          name: 'Triage',
          resourceRequirements: { nurse: 1 },
          duration: 5, // minutes
          next: 'Resuscitation'
        },
        {
          name: 'Resuscitation',
          resourceRequirements: { doctor: 2, nurse: 2, resuscitation_bay: 1, monitor: 1, ventilator: 1, defibrillator: 1 },
          duration: 60, // minutes
          next: 'Stabilization'
        },
        {
          name: 'Stabilization',
          resourceRequirements: { doctor: 1, nurse: 1, resuscitation_bay: 1, monitor: 1 },
          duration: 120, // minutes
          next: 'Disposition'
        },
        {
          name: 'Disposition',
          resourceRequirements: { doctor: 1, nurse: 1 },
          duration: 30, // minutes
          next: null
        }
      ]
    });
    
    // Trauma workflow
    this.workflows.set('trauma', {
      name: 'Trauma Workflow',
      steps: [
        {
          name: 'Triage',
          resourceRequirements: { nurse: 1 },
          duration: 5, // minutes
          next: 'Primary Survey'
        },
        {
          name: 'Primary Survey',
          resourceRequirements: { doctor: 1, nurse: 1, trauma_bay: 1, monitor: 1 },
          duration: 15, // minutes
          next: 'Diagnostic Imaging'
        },
        {
          name: 'Diagnostic Imaging',
          resourceRequirements: { technician: 1, xray: 1 },
          duration: 30, // minutes
          next: 'Treatment'
        },
        {
          name: 'Treatment',
          resourceRequirements: { doctor: 1, nurse: 1, trauma_bay: 1 },
          duration: 60, // minutes
          next: 'Disposition'
        },
        {
          name: 'Disposition',
          resourceRequirements: { doctor: 1, nurse: 1 },
          duration: 30, // minutes
          next: null
        }
      ]
    });
    
    // Fast track workflow
    this.workflows.set('fast_track', {
      name: 'Fast Track Workflow',
      steps: [
        {
          name: 'Triage',
          resourceRequirements: { nurse: 1 },
          duration: 10, // minutes
          next: 'Assessment'
        },
        {
          name: 'Assessment',
          resourceRequirements: { doctor: 1, fast_track_bed: 1 },
          duration: 15, // minutes
          next: 'Treatment'
        },
        {
          name: 'Treatment',
          resourceRequirements: { nurse: 1, fast_track_bed: 1 },
          duration: 30, // minutes
          next: 'Discharge'
        },
        {
          name: 'Discharge',
          resourceRequirements: { nurse: 1 },
          duration: 10, // minutes
          next: null
        }
      ]
    });
    
    // Standard ED workflow
    this.workflows.set('standard', {
      name: 'Standard ED Workflow',
      steps: [
        {
          name: 'Triage',
          resourceRequirements: { nurse: 1 },
          duration: 10, // minutes
          next: 'Assessment'
        },
        {
          name: 'Assessment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 20, // minutes
          next: 'Diagnostic Testing'
        },
        {
          name: 'Diagnostic Testing',
          resourceRequirements: { technician: 1, bed: 1 },
          duration: 45, // minutes
          next: 'Treatment'
        },
        {
          name: 'Treatment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1 },
          duration: 60, // minutes
          next: 'Disposition'
        },
        {
          name: 'Disposition',
          resourceRequirements: { doctor: 1, nurse: 1 },
          duration: 30, // minutes
          next: null
        }
      ]
    });
    
    // Set default workflow to standard
    this.workflows.set('default', this.workflows.get('standard'));
  }
  
  /**
   * Admit a patient to the ED
   * @param {Object} patient - Patient to admit
   * @param {Object} options - Admission options
   * @returns {boolean} - Whether the patient was admitted
   */
  admitPatient(patient, options = {}) {
    // Determine appropriate workflow based on acuity
    let workflow = 'standard';
    
    if (patient.acuityLevel === 1) {
      workflow = 'resuscitation';
    } else if (patient.acuityLevel === 2) {
      workflow = 'trauma';
    } else if (patient.acuityLevel >= 4) {
      workflow = 'fast_track';
    }
    
    // Override workflow if specified
    if (options.workflow) {
      workflow = options.workflow;
    }
    
    // Add workflow to options
    const admitOptions = {
      ...options,
      workflow
    };
    
    // Call parent method
    return super.admitPatient(patient, admitOptions);
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
      // Workflow complete, discharge or transfer patient
      this.completePatientWorkflow(patient, options);
      return;
    }
    
    const step = workflow.steps[stepIndex];
    
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
    
    // Determine disposition based on acuity and other factors
    let disposition = 'discharge';
    let destination = null;
    
    if (patient.acuityLevel <= 2) {
      // High acuity patients likely need admission
      disposition = 'transfer';
      destination = 'icu'; // or 'ward' based on bed availability
    } else if (patient.acuityLevel === 3) {
      // Medium acuity patients may need admission
      disposition = Math.random() < 0.5 ? 'transfer' : 'discharge';
      destination = disposition === 'transfer' ? 'ward' : null;
    }
    
    // Override disposition if specified
    if (options.disposition) {
      disposition = options.disposition;
    }
    
    // Override destination if specified
    if (options.destination) {
      destination = options.destination;
    }
    
    // Update patient treatment path
    if (!patient.treatmentPath) {
      patient.treatmentPath = [];
    }
    
    patient.treatmentPath.push({
      department: this.id,
      action: 'workflow_completed',
      disposition,
      destination,
      time: options.time || Date.now()
    });
    
    // Emit event
    this.emit('patientWorkflowCompleted', {
      patient,
      department: this,
      disposition,
      destination,
      time: options.time || Date.now()
    });
    
    this.logger.info('department', `Patient ${patient.id} completed workflow, disposition: ${disposition}`, patient, {
      departmentId: this.id,
      disposition,
      destination
    });
    
    // Handle disposition
    if (disposition === 'transfer' && destination) {
      // Request transfer to destination department
      this.requestTransfer(patient, destination, options);
    } else {
      // Discharge patient
      this.dischargePatient(patient, {
        ...options,
        status: 'discharged',
        destination: null
      });
    }
  }
  
  /**
   * Request transfer to another department
   * @param {Object} patient - Patient to transfer
   * @param {string} destination - Destination department ID
   * @param {Object} options - Transfer options
   */
  requestTransfer(patient, destination, options = {}) {
    // Emit transfer request event
    this.emit('transferRequest', {
      patient,
      fromDepartment: this,
      toDepartmentId: destination,
      time: options.time || Date.now()
    });
    
    this.logger.info('department', `Transfer requested for patient ${patient.id} to ${destination}`, patient, {
      fromDepartmentId: this.id,
      toDepartmentId: destination
    });
    
    // In a real implementation, this would be handled by a department manager
    // For now, we'll just update the patient status
    const patientData = this.patients.get(patient.id);
    patientData.status = 'awaiting_transfer';
  }
  
  /**
   * Check resource availability
   * @param {Object} requirements - Resource requirements
   * @returns {boolean} - Whether all required resources are available
   */
  checkResourceAvailability(requirements) {
    for (const [resourceType, count] of Object.entries(requirements)) {
      // Check special resource types
      if (resourceType === 'resuscitation_bay') {
        let availableBays = 0;
        
        for (const [id, bay] of this.resuscitationBays.entries()) {
          if (!bay.occupied) {
            availableBays++;
          }
        }
        
        if (availableBays < count) {
          return false;
        }
      } else if (resourceType === 'trauma_bay') {
        let availableBays = 0;
        
        for (const [id, bay] of this.traumaBays.entries()) {
          if (!bay.occupied) {
            availableBays++;
          }
        }
        
        if (availableBays < count) {
          return false;
        }
      } else if (resourceType === 'fast_track_bed') {
        let availableBeds = 0;
        
        for (const [id, bed] of this.fastTrack.entries()) {
          if (!bed.occupied) {
            availableBeds++;
          }
        }
        
        if (availableBeds < count) {
          return false;
        }
      } else if (resourceType === 'bed') {
        if (this.getAvailableBeds() < count) {
          return false;
        }
      } else if (resourceType === 'doctor' || resourceType === 'nurse' || resourceType === 'technician') {
        let availableStaff = 0;
        
        for (const [id, staff] of this.staff.entries()) {
          if (staff.type === resourceType && !staff.busy) {
            availableStaff++;
          }
        }
        
        if (availableStaff < count) {
          return false;
        }
      } else {
        // Check equipment
        let availableEquipment = 0;
        
        for (const [id, equipment] of this.equipment.entries()) {
          if (equipment.type === resourceType && !equipment.inUse) {
            availableEquipment++;
          }
        }
        
        if (availableEquipment < count) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Allocate resources for a patient
   * @param {Object} patient - Patient
   * @param {Object} requirements - Resource requirements
   * @returns {Object} - Allocated resources
   */
  allocateResources(patient, requirements) {
    const allocatedResources = {};
    
    for (const [resourceType, count] of Object.entries(requirements)) {
      allocatedResources[resourceType] = [];
      
      // Allocate special resource types
      if (resourceType === 'resuscitation_bay') {
        for (let i = 0; i < count; i++) {
          for (const [id, bay] of this.resuscitationBays.entries()) {
            if (!bay.occupied) {
              bay.occupied = true;
              bay.patient = patient.id;
              bay.status = 'occupied';
              allocatedResources[resourceType].push(id);
              break;
            }
          }
        }
      } else if (resourceType === 'trauma_bay') {
        for (let i = 0; i < count; i++) {
          for (const [id, bay] of this.traumaBays.entries()) {
            if (!bay.occupied) {
              bay.occupied = true;
              bay.patient = patient.id;
              bay.status = 'occupied';
              allocatedResources[resourceType].push(id);
              break;
            }
          }
        }
      } else if (resourceType === 'fast_track_bed') {
        for (let i = 0; i < count; i++) {
          for (const [id, bed] of this.fastTrack.entries()) {
            if (!bed.occupied) {
              bed.occupied = true;
              bed.patient = patient.id;
              bed.status = 'occupied';
              allocatedResources[resourceType].push(id);
              break;
            }
          }
        }
      } else if (resourceType === 'bed') {
        for (let i = 0; i < count; i++) {
          for (const [id, bed] of this.beds.entries()) {
            if (!bed.occupied) {
              bed.occupied = true;
              bed.patient = patient.id;
              bed.status = 'occupied';
              allocatedResources[resourceType].push(id);
              break;
            }
          }
        }
      } else if (resourceType === 'doctor' || resourceType === 'nurse' || resourceType === 'technician') {
        for (let i = 0; i < count; i++) {
          for (const [id, staff] of this.staff.entries()) {
            if (staff.type === resourceType && !staff.busy) {
              staff.busy = true;
              staff.patient = patient.id;
              staff.status = 'busy';
              allocatedResources[resourceType].push(id);
              break;
            }
          }
        }
      } else {
        // Allocate equipment
        for (let i = 0; i < count; i++) {
          for (const [id, equipment] of this.equipment.entries()) {
            if (equipment.type === resourceType && !equipment.inUse) {
              equipment.inUse = true;
              equipment.patient = patient.id;
              equipment.status = 'in_use';
              allocatedResources[resourceType].push(id);
              break;
            }
          }
        }
      }
    }
    
    return allocatedResources;
  }
  
  /**
   * Release allocated resources
   * @param {Object} resources - Allocated resources
   */
  releaseResources(resources) {
    for (const [resourceType, ids] of Object.entries(resources)) {
      for (const id of ids) {
        if (resourceType === 'resuscitation_bay') {
          const bay = this.resuscitationBays.get(id);
          
          if (bay) {
            bay.occupied = false;
            bay.patient = null;
            bay.status = 'available';
          }
        } else if (resourceType === 'trauma_bay') {
          const bay = this.traumaBays.get(id);
          
          if (bay) {
            bay.occupied = false;
            bay.patient = null;
            bay.status = 'available';
          }
        } else if (resourceType === 'fast_track_bed') {
          const bed = this.fastTrack.get(id);
          
          if (bed) {
            bed.occupied = false;
            bed.patient = null;
            bed.status = 'available';
          }
        } else if (resourceType === 'bed') {
          const bed = this.beds.get(id);
          
          if (bed) {
            bed.occupied = false;
            bed.patient = null;
            bed.status = 'available';
          }
        } else if (resourceType === 'doctor' || resourceType === 'nurse' || resourceType === 'technician') {
          const staff = this.staff.get(id);
          
          if (staff) {
            staff.busy = false;
            staff.patient = null;
            staff.status = 'available';
          }
        } else {
          // Release equipment
          const equipment = this.equipment.get(id);
          
          if (equipment) {
            equipment.inUse = false;
            equipment.patient = null;
            equipment.status = 'available';
          }
        }
      }
    }
  }
  
  /**
   * Reset department
   */
  reset() {
    // Call parent reset
    super.reset();
    
    // Reset ED-specific resources
    for (const [id, bay] of this.resuscitationBays.entries()) {
      bay.occupied = false;
      bay.patient = null;
      bay.status = 'available';
    }
    
    for (const [id, bay] of this.traumaBays.entries()) {
      bay.occupied = false;
      bay.patient = null;
      bay.status = 'available';
    }
    
    for (const [id, bed] of this.fastTrack.entries()) {
      bed.occupied = false;
      bed.patient = null;
      bed.status = 'available';
    }
    
    // Clear triage queue
    this.triageQueue = [];
  }
}

// Export the class
export default EmergencyDepartment;
