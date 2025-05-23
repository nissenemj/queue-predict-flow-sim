/**
 * IntensiveCareUnit.js
 * Intensive Care Unit (ICU) implementation
 */

import Department from './Department.js';

/**
 * Intensive Care Unit class
 * Specialized department for critical care
 */
class IntensiveCareUnit extends Department {
  /**
   * Constructor for the IntensiveCareUnit class
   * @param {Object} config - Department configuration
   * @param {Object} options - Department options
   */
  constructor(config, options = {}) {
    // Set default values for ICU
    const icuConfig = {
      id: config.id || 'icu',
      name: config.name || 'Intensive Care Unit',
      type: 'icu',
      capacity: config.capacity || 20,
      beds: config.beds || 20,
      staff: config.staff || {
        doctor: 5,
        nurse: 15,
        respiratory_therapist: 3
      },
      equipment: config.equipment || {
        monitor: 20,
        ventilator: 20,
        infusion_pump: 40,
        dialysis_machine: 5
      },
      ...config
    };
    
    super(icuConfig, options);
    
    // ICU-specific properties
    this.isolationRooms = new Map();
    this.ventilatedPatients = new Map();
    this.acuityScores = new Map();
    
    // Initialize ICU-specific resources
    this.initializeICUResources(icuConfig);
    
    // Initialize ICU-specific workflows
    this.initializeICUWorkflows(icuConfig);
  }
  
  /**
   * Initialize ICU-specific resources
   * @param {Object} config - Department configuration
   */
  initializeICUResources(config) {
    // Initialize isolation rooms
    const isolationRooms = config.isolationRooms || 4;
    
    for (let i = 0; i < isolationRooms; i++) {
      const room = {
        id: `${this.id}_isolation_${i + 1}`,
        type: 'isolation_room',
        department: this.id,
        occupied: false,
        patient: null,
        status: 'available',
        equipment: ['monitor', 'ventilator', 'infusion_pump']
      };
      
      this.isolationRooms.set(room.id, room);
    }
    
    this.logger.debug('department', `Initialized ${isolationRooms} isolation rooms`, null, { departmentId: this.id });
  }
  
  /**
   * Initialize ICU-specific workflows
   * @param {Object} config - Department configuration
   */
  initializeICUWorkflows(config) {
    // Critical care workflow
    this.workflows.set('critical_care', {
      name: 'Critical Care Workflow',
      steps: [
        {
          name: 'Admission',
          resourceRequirements: { doctor: 1, nurse: 2, bed: 1, monitor: 1 },
          duration: 30, // minutes
          next: 'Assessment'
        },
        {
          name: 'Assessment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1, monitor: 1 },
          duration: 60, // minutes
          next: 'Treatment'
        },
        {
          name: 'Treatment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1, monitor: 1, infusion_pump: 2 },
          duration: 240, // minutes
          next: 'Monitoring'
        },
        {
          name: 'Monitoring',
          resourceRequirements: { nurse: 1, bed: 1, monitor: 1 },
          duration: 720, // minutes (12 hours)
          next: 'Reassessment'
        },
        {
          name: 'Reassessment',
          resourceRequirements: { doctor: 1, nurse: 1, bed: 1, monitor: 1 },
          duration: 30, // minutes
          next: 'Disposition'
        },
        {
          name: 'Disposition',
          resourceRequirements: { doctor: 1, nurse: 1 },
          duration: 60, // minutes
          next: null
        }
      ]
    });
    
    // Ventilated patient workflow
    this.workflows.set('ventilated', {
      name: 'Ventilated Patient Workflow',
      steps: [
        {
          name: 'Admission',
          resourceRequirements: { doctor: 1, nurse: 2, respiratory_therapist: 1, bed: 1, monitor: 1, ventilator: 1 },
          duration: 45, // minutes
          next: 'Stabilization'
        },
        {
          name: 'Stabilization',
          resourceRequirements: { doctor: 1, nurse: 1, respiratory_therapist: 1, bed: 1, monitor: 1, ventilator: 1, infusion_pump: 3 },
          duration: 120, // minutes
          next: 'Ongoing Care'
        },
        {
          name: 'Ongoing Care',
          resourceRequirements: { nurse: 1, bed: 1, monitor: 1, ventilator: 1, infusion_pump: 2 },
          duration: 720, // minutes (12 hours)
          next: 'Respiratory Assessment'
        },
        {
          name: 'Respiratory Assessment',
          resourceRequirements: { doctor: 1, respiratory_therapist: 1, bed: 1, monitor: 1, ventilator: 1 },
          duration: 30, // minutes
          next: 'Weaning Trial'
        },
        {
          name: 'Weaning Trial',
          resourceRequirements: { doctor: 1, nurse: 1, respiratory_therapist: 1, bed: 1, monitor: 1, ventilator: 1 },
          duration: 120, // minutes
          next: 'Disposition'
        },
        {
          name: 'Disposition',
          resourceRequirements: { doctor: 1, nurse: 1, respiratory_therapist: 1 },
          duration: 60, // minutes
          next: null
        }
      ]
    });
    
    // Isolation workflow
    this.workflows.set('isolation', {
      name: 'Isolation Workflow',
      steps: [
        {
          name: 'Admission',
          resourceRequirements: { doctor: 1, nurse: 2, isolation_room: 1, monitor: 1 },
          duration: 45, // minutes
          next: 'Assessment'
        },
        {
          name: 'Assessment',
          resourceRequirements: { doctor: 1, nurse: 1, isolation_room: 1, monitor: 1 },
          duration: 60, // minutes
          next: 'Treatment'
        },
        {
          name: 'Treatment',
          resourceRequirements: { doctor: 1, nurse: 1, isolation_room: 1, monitor: 1, infusion_pump: 2 },
          duration: 180, // minutes
          next: 'Monitoring'
        },
        {
          name: 'Monitoring',
          resourceRequirements: { nurse: 1, isolation_room: 1, monitor: 1 },
          duration: 720, // minutes (12 hours)
          next: 'Reassessment'
        },
        {
          name: 'Reassessment',
          resourceRequirements: { doctor: 1, nurse: 1, isolation_room: 1, monitor: 1 },
          duration: 30, // minutes
          next: 'Disposition'
        },
        {
          name: 'Disposition',
          resourceRequirements: { doctor: 1, nurse: 1 },
          duration: 60, // minutes
          next: null
        }
      ]
    });
    
    // Set default workflow to critical care
    this.workflows.set('default', this.workflows.get('critical_care'));
  }
  
  /**
   * Admit a patient to the ICU
   * @param {Object} patient - Patient to admit
   * @param {Object} options - Admission options
   * @returns {boolean} - Whether the patient was admitted
   */
  admitPatient(patient, options = {}) {
    // Calculate acuity score
    const acuityScore = this.calculateAcuityScore(patient);
    this.acuityScores.set(patient.id, acuityScore);
    
    // Determine appropriate workflow based on patient condition
    let workflow = 'critical_care';
    
    // Check if patient needs ventilation
    if (patient.requiresVentilation || (patient.acuityLevel === 1 && Math.random() < 0.8)) {
      workflow = 'ventilated';
      
      // Mark as ventilated if admitted
      if (super.admitPatient(patient, { ...options, workflow })) {
        this.ventilatedPatients.set(patient.id, {
          startTime: options.time || Date.now(),
          expectedDuration: 72 * 60 // 72 hours in minutes
        });
        return true;
      }
      return false;
    }
    
    // Check if patient needs isolation
    if (patient.requiresIsolation || (patient.comorbidities && patient.comorbidities.some(c => c.name === 'Infectious Disease'))) {
      workflow = 'isolation';
      
      // Check if isolation room is available
      let isolationRoomAvailable = false;
      for (const [id, room] of this.isolationRooms.entries()) {
        if (!room.occupied) {
          isolationRoomAvailable = true;
          break;
        }
      }
      
      if (!isolationRoomAvailable && !options.force) {
        this.logger.warn('department', `No isolation rooms available for patient ${patient.id}`, patient);
        return false;
      }
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
    
    // Special handling for ventilated patients
    if (this.ventilatedPatients.has(patient.id) && step.name === 'Weaning Trial') {
      // Determine if weaning was successful
      const weaningSuccess = Math.random() < 0.7; // 70% success rate
      
      if (weaningSuccess) {
        // Remove from ventilated patients
        this.ventilatedPatients.delete(patient.id);
        
        // Update patient
        patient.requiresVentilation = false;
        
        // Update treatment path
        patient.treatmentPath.push({
          department: this.id,
          action: 'Ventilator weaning successful',
          time: options.time || Date.now()
        });
        
        this.logger.info('department', `Patient ${patient.id} successfully weaned from ventilator`, patient);
      } else {
        // Failed weaning, restart ventilated workflow
        patientData.currentStep = 1; // Go back to stabilization step
        
        // Update treatment path
        patient.treatmentPath.push({
          department: this.id,
          action: 'Ventilator weaning failed',
          time: options.time || Date.now()
        });
        
        this.logger.info('department', `Patient ${patient.id} failed ventilator weaning`, patient);
        
        // Process next step
        this.processWorkflowStep(patient, options);
        return;
      }
    }
    
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
    let disposition = 'transfer';
    let destination = 'ward'; // Default to ward
    
    // Check if patient still requires ICU care
    const acuityScore = this.acuityScores.get(patient.id) || 0;
    
    if (acuityScore > 15) {
      // Patient still requires ICU care
      disposition = 'continue';
      destination = null;
    } else if (acuityScore > 10) {
      // Patient can be transferred to step-down unit if available
      disposition = 'transfer';
      destination = 'step_down';
    } else if (acuityScore < 5 && patient.acuityLevel >= 4) {
      // Patient can be discharged
      disposition = 'discharge';
      destination = null;
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
    if (disposition === 'continue') {
      // Restart workflow
      patientData.currentStep = 0;
      this.processWorkflowStep(patient, options);
    } else if (disposition === 'transfer' && destination) {
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
   * Calculate acuity score for a patient
   * @param {Object} patient - Patient
   * @returns {number} - Acuity score (0-20)
   */
  calculateAcuityScore(patient) {
    // Base score on acuity level (1-5, where 1 is most acute)
    let score = (6 - patient.acuityLevel) * 4; // 4-20 points
    
    // Add points for comorbidities
    if (patient.comorbidities) {
      for (const comorbidity of patient.comorbidities) {
        score += comorbidity.severity || 1;
      }
    }
    
    // Add points for ventilation
    if (patient.requiresVentilation) {
      score += 5;
    }
    
    // Add points for age
    if (patient.age > 70) {
      score += 2;
    } else if (patient.age < 12) {
      score += 2;
    }
    
    // Cap score at 20
    return Math.min(20, score);
  }
  
  /**
   * Check resource availability
   * @param {Object} requirements - Resource requirements
   * @returns {boolean} - Whether all required resources are available
   */
  checkResourceAvailability(requirements) {
    for (const [resourceType, count] of Object.entries(requirements)) {
      // Check special resource types
      if (resourceType === 'isolation_room') {
        let availableRooms = 0;
        
        for (const [id, room] of this.isolationRooms.entries()) {
          if (!room.occupied) {
            availableRooms++;
          }
        }
        
        if (availableRooms < count) {
          return false;
        }
      } else {
        // Use parent method for standard resources
        const standardRequirements = { [resourceType]: count };
        if (!super.checkResourceAvailability(standardRequirements)) {
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
      if (resourceType === 'isolation_room') {
        for (let i = 0; i < count; i++) {
          for (const [id, room] of this.isolationRooms.entries()) {
            if (!room.occupied) {
              room.occupied = true;
              room.patient = patient.id;
              room.status = 'occupied';
              allocatedResources[resourceType].push(id);
              break;
            }
          }
        }
      } else {
        // Use parent method for standard resources
        const standardRequirements = { [resourceType]: count };
        const standardResources = super.allocateResources(patient, standardRequirements);
        allocatedResources[resourceType] = standardResources[resourceType];
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
      // Release special resource types
      if (resourceType === 'isolation_room') {
        for (const id of ids) {
          const room = this.isolationRooms.get(id);
          
          if (room) {
            room.occupied = false;
            room.patient = null;
            room.status = 'available';
          }
        }
      } else {
        // Use parent method for standard resources
        const standardResources = { [resourceType]: ids };
        super.releaseResources(standardResources);
      }
    }
  }
  
  /**
   * Reset department
   */
  reset() {
    // Call parent reset
    super.reset();
    
    // Reset ICU-specific resources
    for (const [id, room] of this.isolationRooms.entries()) {
      room.occupied = false;
      room.patient = null;
      room.status = 'available';
    }
    
    // Clear ventilated patients
    this.ventilatedPatients.clear();
    
    // Clear acuity scores
    this.acuityScores.clear();
  }
}

// Export the class
export default IntensiveCareUnit;
