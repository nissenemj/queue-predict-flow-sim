/**
 * HospitalSimulator.js
 * Advanced hospital simulator with specialized healthcare event types
 * and priority-based resource allocation
 */

import SimulationEngine from './SimulationEngine.js';
import Patient from '../models/Patient.js';
import HospitalResourceManager from '../utils/HospitalResourceManager.js';
import { EmergencyArrival, PatientTransfer, PatientDischarge } from '../models/HealthcareEvents.js';
import PredictionService from '../ml/PredictionService.js';

/**
 * HospitalSimulator class
 * Extends SimulationEngine with healthcare-specific functionality
 */
class HospitalSimulator extends SimulationEngine {
  /**
   * Constructor for HospitalSimulator
   * @param {Object} config - Configuration for the simulation
   * @param {Object} options - Additional options
   */
  constructor(config, options = {}) {
    super(config, options);

    // Replace the default resource manager with our specialized one
    this.resourceManager = new HospitalResourceManager(config, this.logger);

    // Initialize hospital-specific properties
    this.patientCounter = 0;
    this.departments = new Map();
    this.waitingRooms = new Map();
    this.clinicalPathways = new Map();
    this.patientFlows = [];
    this.statistics = {
      arrivals: {
        total: 0,
        emergency: 0,
        urgent: 0,
        nonUrgent: 0
      },
      discharges: {
        total: 0,
        home: 0,
        transfer: 0,
        expired: 0
      },
      waitTimes: {
        emergency: [],
        urgent: [],
        nonUrgent: []
      },
      lengthOfStay: [],
      bedOccupancy: [],
      resourceUtilization: {}
    };

    // Initialize prediction service if ML is enabled
    if (config.enableML) {
      this.predictionService = new PredictionService(config.mlConfig || {});
    }

    // Initialize hospital structure
    this.initializeHospital();
  }

  /**
   * Initialize hospital structure
   */
  initializeHospital() {
    // Create departments
    this.createDepartment('emergency', 'Emergency Department');
    this.createDepartment('icu', 'Intensive Care Unit');
    this.createDepartment('ward', 'General Ward');
    this.createDepartment('or', 'Operating Room');
    this.createDepartment('radiology', 'Radiology');
    this.createDepartment('laboratory', 'Laboratory');

    // Create waiting rooms
    this.createWaitingRoom('emergency', 50);
    this.createWaitingRoom('radiology', 20);
    this.createWaitingRoom('laboratory', 15);

    // Define clinical pathways
    this.defineClinicalPathways();
  }

  /**
   * Create a department
   * @param {string} id - Department ID
   * @param {string} name - Department name
   */
  createDepartment(id, name) {
    this.departments.set(id, {
      id,
      name,
      patients: new Map(),
      capacity: 0,
      occupancy: 0
    });
  }

  /**
   * Create a waiting room
   * @param {string} departmentId - Department ID
   * @param {number} capacity - Capacity of the waiting room
   */
  createWaitingRoom(departmentId, capacity) {
    this.waitingRooms.set(departmentId, {
      departmentId,
      capacity,
      patients: new Map(),
      waitingQueue: []
    });
  }

  /**
   * Define clinical pathways
   */
  defineClinicalPathways() {
    // Resuscitation pathway
    this.clinicalPathways.set('resuscitation', {
      id: 'resuscitation',
      name: 'Resuscitation Pathway',
      steps: [
        { id: 'triage', department: 'emergency', duration: 5, resources: { nurses: 1 } },
        { id: 'resuscitation', department: 'emergency', duration: 60, resources: { doctors: 2, nurses: 2, beds: 1, ventilators: 1 } },
        { id: 'stabilization', department: 'emergency', duration: 120, resources: { doctors: 1, nurses: 1, beds: 1 } },
        { id: 'icu_transfer', department: 'icu', duration: 20, resources: { nurses: 1 } },
        { id: 'icu_care', department: 'icu', duration: 4320, resources: { doctors: 1, nurses: 2, beds: 1, ventilators: 1 } } // 3 days
      ]
    });

    // Cardiac pathway
    this.clinicalPathways.set('cardiac', {
      id: 'cardiac',
      name: 'Cardiac Pathway',
      steps: [
        { id: 'triage', department: 'emergency', duration: 10, resources: { nurses: 1 } },
        { id: 'assessment', department: 'emergency', duration: 30, resources: { doctors: 1, nurses: 1, beds: 1 } },
        { id: 'ecg', department: 'emergency', duration: 15, resources: { nurses: 1, equipment: 1 } },
        { id: 'cardiac_care', department: 'emergency', duration: 180, resources: { doctors: 1, nurses: 1, beds: 1 } },
        { id: 'ward_transfer', department: 'ward', duration: 20, resources: { nurses: 1 } },
        { id: 'ward_care', department: 'ward', duration: 2880, resources: { doctors: 1, nurses: 1, beds: 1 } } // 2 days
      ]
    });

    // Trauma pathway
    this.clinicalPathways.set('trauma', {
      id: 'trauma',
      name: 'Trauma Pathway',
      steps: [
        { id: 'triage', department: 'emergency', duration: 5, resources: { nurses: 1 } },
        { id: 'trauma_assessment', department: 'emergency', duration: 30, resources: { doctors: 2, nurses: 2, beds: 1 } },
        { id: 'imaging', department: 'radiology', duration: 45, resources: { technicians: 1, equipment: 1 } },
        { id: 'surgery_prep', department: 'or', duration: 60, resources: { doctors: 1, nurses: 2 } },
        { id: 'surgery', department: 'or', duration: 180, resources: { doctors: 2, nurses: 2, rooms: 1 } },
        { id: 'recovery', department: 'ward', duration: 4320, resources: { doctors: 1, nurses: 1, beds: 1 } } // 3 days
      ]
    });

    // Standard pathway
    this.clinicalPathways.set('standard', {
      id: 'standard',
      name: 'Standard Pathway',
      steps: [
        { id: 'triage', department: 'emergency', duration: 15, resources: { nurses: 1 } },
        { id: 'assessment', department: 'emergency', duration: 30, resources: { doctors: 1, nurses: 1 } },
        { id: 'treatment', department: 'emergency', duration: 60, resources: { doctors: 1, nurses: 1, beds: 1 } },
        { id: 'discharge', department: 'emergency', duration: 15, resources: { nurses: 1 } }
      ]
    });
  }

  /**
   * Run the hospital simulation
   * @param {number} duration - Duration of the simulation in minutes
   * @returns {Object} - Simulation results
   */
  run(duration) {
    // Schedule initial events
    this.scheduleInitialEvents(duration);

    // Register event handlers
    this.registerEventHandlers();

    // Run the simulation
    super.run(duration);

    // Calculate and return results
    return this.calculateResults();
  }

  /**
   * Register event handlers for the simulation
   */
  registerEventHandlers() {
    // Register patient flow event handlers
    this.registerEventHandler('patient_arrival', this.processPatientArrival.bind(this));
    this.registerEventHandler('emergency_arrival', this.processEmergencyArrival.bind(this));
    this.registerEventHandler('triage', this.processTriage.bind(this));
    this.registerEventHandler('pathway_step_complete', this.processPathwayStepComplete.bind(this));
    this.registerEventHandler('transfer', this.processTransfer.bind(this));
    this.registerEventHandler('discharge', this.processDischarge.bind(this));

    // Register resource management event handlers
    this.registerEventHandler('process_resource_queue', this.processProcessResourceQueue.bind(this));
    this.registerEventHandler('collect_statistics', this.processCollectStatistics.bind(this));

    // Register retry event handlers
    this.registerEventHandler('retry_pathway_step', (event) => {
      const { time, entity } = event;
      this.scheduleNextPathwayStep(entity, time);
    });

    // Register resource release event handlers
    this.registerEventHandler('release_transfer_resources', (event) => {
      const { time, entity, data } = event;
      // Resources are automatically released by the resource manager
    });

    this.registerEventHandler('release_discharge_resources', (event) => {
      const { time, data } = event;
      // Resources are automatically released by the resource manager
    });
  }

  /**
   * Schedule initial events for the simulation
   * @param {number} duration - Duration of the simulation in minutes
   */
  scheduleInitialEvents(duration) {
    const config = this.config;

    // Schedule regular patient arrivals
    this.scheduleRegularArrivals(duration);

    // Schedule emergency arrivals
    this.scheduleEmergencyArrivals(duration);

    // Schedule resource processing
    for (let time = 60; time < duration; time += 60) {
      this.scheduleEvent(time, null, 'process_resource_queue');
    }

    // Schedule statistics collection
    for (let time = 60; time < duration; time += 60) {
      this.scheduleEvent(time, null, 'collect_statistics');
    }
  }

  /**
   * Schedule regular patient arrivals
   * @param {number} duration - Duration of the simulation in minutes
   */
  scheduleRegularArrivals(duration) {
    const config = this.config;
    const arrivalRate = config.patientArrivalRate || 10; // patients per hour
    const avgTimeBetweenArrivals = 60 / arrivalRate;

    let time = this.getPoissonRandomTime(avgTimeBetweenArrivals);

    while (time < duration) {
      // Schedule a regular arrival
      this.scheduleEvent(time, null, 'patient_arrival');

      // Get next arrival time
      time += this.getPoissonRandomTime(avgTimeBetweenArrivals);
    }
  }

  /**
   * Schedule emergency arrivals
   * @param {number} duration - Duration of the simulation in minutes
   */
  scheduleEmergencyArrivals(duration) {
    const config = this.config;
    const emergencyRate = config.emergencyArrivalRate || 2; // emergencies per hour
    const avgTimeBetweenEmergencies = 60 / emergencyRate;

    let time = this.getPoissonRandomTime(avgTimeBetweenEmergencies);

    while (time < duration) {
      // Create emergency arrival event
      const emergencyEvent = new EmergencyArrival({
        arrivalMode: Math.random() < 0.7 ? 'ambulance' : (Math.random() < 0.5 ? 'helicopter' : 'transfer'),
        condition: this.getRandomEmergencyCondition(),
        estimatedAcuity: Math.random() < 0.7 ? 1 : 2,
        preNotification: Math.random() < 0.8
      });

      // Schedule emergency arrival with high priority
      this.scheduleEvent(time, emergencyEvent, 'emergency_arrival', {}, emergencyEvent.priority);

      // Get next emergency arrival time
      time += this.getPoissonRandomTime(avgTimeBetweenEmergencies);
    }
  }

  /**
   * Get a random emergency condition
   * @returns {string} - Random emergency condition
   */
  getRandomEmergencyCondition() {
    const conditions = ['cardiac', 'trauma', 'stroke', 'respiratory', 'sepsis'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  /**
   * Generate a Poisson random time
   * @param {number} mean - Mean time
   * @returns {number} - Random time
   */
  getPoissonRandomTime(mean) {
    const L = Math.exp(-mean);
    let p = 1.0;
    let k = 0;

    do {
      k++;
      p *= Math.random();
    } while (p > L);

    return Math.max(1, Math.floor(k - 1));
  }

  /**
   * Process a patient arrival event
   * @param {Object} event - Event object
   */
  processPatientArrival(event) {
    const { time } = event;

    // Create a new patient
    this.patientCounter++;
    const patient = new Patient(this.patientCounter, time);

    // Add patient to the simulation
    this.addEntity(patient);

    // Log the arrival
    this.logger.info('patient', `Patient ${patient.id} arrived`, patient, {
      acuityLevel: patient.acuityLevel,
      age: patient.age,
      comorbidities: patient.comorbidities,
      arrivalMode: patient.arrivalMode,
      isEmergency: patient.isEmergency
    }, time);

    // Update statistics
    this.statistics.arrivals.total++;
    if (patient.acuityLevel <= 2) {
      this.statistics.arrivals.emergency++;
    } else if (patient.acuityLevel <= 3) {
      this.statistics.arrivals.urgent++;
    } else {
      this.statistics.arrivals.nonUrgent++;
    }

    // Send patient to triage
    this.scheduleEvent(time + 5, patient, 'triage');
  }

  /**
   * Process an emergency arrival event
   * @param {Object} event - Event object
   */
  processEmergencyArrival(event) {
    const { time, entity } = event;
    const emergencyEvent = entity;

    // Create a new patient with emergency attributes
    this.patientCounter++;
    const patient = new Patient(this.patientCounter, time, {
      acuityLevel: emergencyEvent.estimatedAcuity,
      isEmergency: true,
      arrivalMode: emergencyEvent.arrivalMode
    });

    // Add patient to the simulation
    this.addEntity(patient);

    // Log the emergency arrival
    this.logger.info('emergency', `Emergency patient ${patient.id} arrived via ${emergencyEvent.arrivalMode}`, patient, {
      condition: emergencyEvent.condition,
      acuityLevel: patient.acuityLevel,
      preNotification: emergencyEvent.preNotification,
      resourceRequirements: emergencyEvent.resourceRequirements
    }, time);

    // Update statistics
    this.statistics.arrivals.total++;
    this.statistics.arrivals.emergency++;

    // If pre-notification, prepare resources
    if (emergencyEvent.preNotification) {
      // Request resources in advance
      this.resourceManager.requestResources(
        patient,
        emergencyEvent.resourceRequirements,
        patient.priorityScore,
        time
      );

      // Schedule immediate triage
      this.scheduleEvent(time + 1, patient, 'triage', {}, 90);
    } else {
      // Schedule triage with high priority
      this.scheduleEvent(time + 2, patient, 'triage', {}, 80);
    }
  }

  /**
   * Process a triage event
   * @param {Object} event - Event object
   */
  processTriage(event) {
    const { time, entity } = event;
    const patient = entity;

    // Log triage
    this.logger.info('triage', `Patient ${patient.id} in triage`, patient, {
      acuityLevel: patient.acuityLevel,
      isEmergency: patient.isEmergency,
      priorityScore: patient.priorityScore
    }, time);

    // Assign clinical pathway if not already assigned
    if (!patient.clinicalPathway) {
      patient.clinicalPathway = this.assignClinicalPathway(patient);
    }

    // Get the pathway steps
    const pathway = this.clinicalPathways.get(patient.clinicalPathway);

    if (!pathway) {
      this.logger.error('triage', `No pathway found for ${patient.clinicalPathway}`, patient, {}, time);
      this.scheduleEvent(time + 10, patient, 'discharge', { reason: 'error' });
      return;
    }

    // Start the patient on the first step of their pathway
    patient.currentPathwayStep = 0;
    patient.currentLocation = 'emergency';

    // Schedule the first step
    this.scheduleNextPathwayStep(patient, time);
  }

  /**
   * Assign a clinical pathway to a patient
   * @param {Object} patient - Patient object
   * @returns {string} - Clinical pathway ID
   */
  assignClinicalPathway(patient) {
    // Use the patient's own assignment if available
    if (patient.clinicalPathway && this.clinicalPathways.has(patient.clinicalPathway)) {
      return patient.clinicalPathway;
    }

    // Assign based on acuity and other factors
    if (patient.acuityLevel === 1) {
      return 'resuscitation';
    } else if (patient.acuityLevel === 2) {
      if (patient.comorbidities.includes('cardiac')) {
        return 'cardiac';
      } else if (patient.comorbidities.includes('trauma')) {
        return 'trauma';
      } else {
        return 'cardiac'; // Default for level 2
      }
    } else {
      return 'standard';
    }
  }

  /**
   * Schedule the next step in a patient's clinical pathway
   * @param {Object} patient - Patient object
   * @param {number} time - Current time
   */
  scheduleNextPathwayStep(patient, time) {
    const pathway = this.clinicalPathways.get(patient.clinicalPathway);

    if (!pathway || patient.currentPathwayStep >= pathway.steps.length) {
      // End of pathway, discharge the patient
      this.scheduleEvent(time + 15, patient, 'discharge', { reason: 'completed' });
      return;
    }

    // Get the current step
    const step = pathway.steps[patient.currentPathwayStep];

    // Update patient location if different
    if (patient.currentLocation !== step.department) {
      // Schedule a transfer
      this.scheduleEvent(time + 10, patient, 'transfer', {
        fromDepartment: patient.currentLocation,
        toDepartment: step.department
      }, patient.priorityScore);

      return;
    }

    // Request resources for this step
    const result = this.resourceManager.requestResources(
      patient,
      step.resources,
      patient.priorityScore,
      time
    );

    if (result.success) {
      // Resources allocated, schedule step completion
      this.scheduleEvent(time + step.duration, patient, 'pathway_step_complete', {
        stepId: step.id,
        resources: step.resources
      }, patient.priorityScore);

      // Log step start
      this.logger.info('pathway', `Patient ${patient.id} starting pathway step: ${step.id}`, patient, {
        pathway: patient.clinicalPathway,
        step: step.id,
        department: step.department,
        duration: step.duration
      }, time);
    } else {
      // Resources not available, add to waiting list
      const waitingRoom = this.waitingRooms.get(step.department);

      if (waitingRoom) {
        waitingRoom.waitingQueue.push({
          patient,
          step,
          priority: patient.priorityScore,
          time
        });

        waitingRoom.waitingQueue.sort((a, b) => b.priority - a.priority);

        // Log waiting
        this.logger.info('waiting', `Patient ${patient.id} waiting for resources`, patient, {
          department: step.department,
          step: step.id,
          queuePosition: waitingRoom.waitingQueue.length
        }, time);
      } else {
        // No waiting room, try again later
        this.scheduleEvent(time + 15, patient, 'retry_pathway_step', {}, patient.priorityScore);
      }
    }
  }

  /**
   * Process a pathway step completion event
   * @param {Object} event - Event object
   */
  processPathwayStepComplete(event) {
    const { time, entity, data } = event;
    const patient = entity;
    const { stepId, resources } = data;

    // Release resources used for this step
    if (resources) {
      for (const [resourceType, amount] of Object.entries(resources)) {
        // Resources are released automatically by the resource manager
      }
    }

    // Log step completion
    this.logger.info('pathway', `Patient ${patient.id} completed pathway step: ${stepId}`, patient, {
      pathway: patient.clinicalPathway,
      step: stepId,
      department: patient.currentLocation
    }, time);

    // Move to next step
    patient.currentPathwayStep++;

    // Schedule next step
    this.scheduleNextPathwayStep(patient, time);
  }

  /**
   * Process a transfer event
   * @param {Object} event - Event object
   */
  processTransfer(event) {
    const { time, entity, data } = event;
    const patient = entity;
    const { fromDepartment, toDepartment } = data;

    // Create transfer event
    const transferEvent = new PatientTransfer({
      sourceLocation: fromDepartment,
      targetLocation: toDepartment,
      transferReason: 'clinical_pathway',
      isEmergent: patient.isEmergency
    });

    // Request resources for transfer
    const result = this.resourceManager.requestResources(
      patient,
      transferEvent.resourceRequirements,
      patient.priorityScore,
      time
    );

    if (result.success) {
      // Update patient location
      patient.currentLocation = toDepartment;

      // Log transfer
      this.logger.info('transfer', `Patient ${patient.id} transferred from ${fromDepartment} to ${toDepartment}`, patient, {
        transferReason: transferEvent.transferReason,
        isEmergent: transferEvent.isEmergent,
        duration: transferEvent.estimatedDuration
      }, time);

      // Release transfer resources after the transfer duration
      this.scheduleEvent(time + transferEvent.estimatedDuration, patient, 'release_transfer_resources', {
        resources: transferEvent.resourceRequirements
      });

      // Continue with pathway
      this.scheduleNextPathwayStep(patient, time + transferEvent.estimatedDuration);
    } else {
      // Transfer resources not available, try again later
      this.scheduleEvent(time + 15, patient, 'transfer', {
        fromDepartment,
        toDepartment
      }, patient.priorityScore);
    }
  }

  /**
   * Process a discharge event
   * @param {Object} event - Event object
   */
  processDischarge(event) {
    const { time, entity, data } = event;
    const patient = entity;
    const { reason } = data || { reason: 'completed' };

    // Create discharge event
    const dischargeEvent = new PatientDischarge({
      dischargeType: reason === 'completed' ? 'routine' : (reason === 'against_medical_advice' ? 'against_medical_advice' : 'early'),
      dischargeDestination: 'home',
      requiresFollowUp: Math.random() < 0.7
    });

    // Request resources for discharge
    const result = this.resourceManager.requestResources(
      patient,
      dischargeEvent.resourceRequirements,
      patient.priorityScore,
      time
    );

    if (result.success) {
      // Update patient status
      patient.status = 'discharged';
      patient.discharged = true;
      patient.dischargeTime = time;
      patient.totalLengthOfStay = time - patient.arrivalTime;

      // Log discharge
      this.logger.info('discharge', `Patient ${patient.id} discharged`, patient, {
        dischargeType: dischargeEvent.dischargeType,
        dischargeDestination: dischargeEvent.dischargeDestination,
        requiresFollowUp: dischargeEvent.requiresFollowUp,
        lengthOfStay: patient.totalLengthOfStay
      }, time);

      // Update statistics
      this.statistics.discharges.total++;
      this.statistics.discharges.home++;
      this.statistics.lengthOfStay.push(patient.totalLengthOfStay);

      // Add wait time statistics
      if (patient.acuityLevel <= 2) {
        this.statistics.waitTimes.emergency.push(patient.waitingTimes.triage || 0);
      } else if (patient.acuityLevel <= 3) {
        this.statistics.waitTimes.urgent.push(patient.waitingTimes.triage || 0);
      } else {
        this.statistics.waitTimes.nonUrgent.push(patient.waitingTimes.triage || 0);
      }

      // Release all resources
      this.resourceManager.releaseAllResources(patient, time);

      // Release discharge resources after the discharge process
      this.scheduleEvent(time + dischargeEvent.estimatedDuration, null, 'release_discharge_resources', {
        resources: dischargeEvent.resourceRequirements,
        patient: patient.id
      });
    } else {
      // Discharge resources not available, try again later
      this.scheduleEvent(time + 30, patient, 'discharge', { reason }, patient.priorityScore);
    }
  }

  /**
   * Process resource queue event
   * @param {Object} event - Event object
   */
  processProcessResourceQueue(event) {
    const { time } = event;

    // Process the resource request queue
    const processedCount = this.resourceManager.processRequestQueue(time);

    if (processedCount > 0) {
      this.logger.info('resource', `Processed ${processedCount} resource requests`, null, {}, time);
    }

    // Process waiting rooms
    this.processWaitingRooms(time);
  }

  /**
   * Process waiting rooms
   * @param {number} time - Current time
   */
  processWaitingRooms(time) {
    for (const [departmentId, waitingRoom] of this.waitingRooms.entries()) {
      // Sort waiting queue by priority
      waitingRoom.waitingQueue.sort((a, b) => b.priority - a.priority);

      // Try to process waiting patients
      const processed = [];

      for (const waitingItem of waitingRoom.waitingQueue) {
        const { patient, step } = waitingItem;

        // Skip if patient is no longer waiting
        if (patient.status !== 'waiting') {
          processed.push(waitingItem);
          continue;
        }

        // Try to allocate resources
        const result = this.resourceManager.requestResources(
          patient,
          step.resources,
          patient.priorityScore,
          time
        );

        if (result.success) {
          // Resources allocated, schedule step completion
          this.scheduleEvent(time + step.duration, patient, 'pathway_step_complete', {
            stepId: step.id,
            resources: step.resources
          }, patient.priorityScore);

          // Log step start
          this.logger.info('pathway', `Patient ${patient.id} starting pathway step from waiting room: ${step.id}`, patient, {
            pathway: patient.clinicalPathway,
            step: step.id,
            department: step.department,
            duration: step.duration,
            waitTime: time - waitingItem.time
          }, time);

          // Add to processed list
          processed.push(waitingItem);
        }
      }

      // Remove processed items from waiting queue
      waitingRoom.waitingQueue = waitingRoom.waitingQueue.filter(item => !processed.includes(item));
    }
  }

  /**
   * Process collect statistics event
   * @param {Object} event - Event object
   */
  processCollectStatistics(event) {
    const { time } = event;

    // Collect bed occupancy
    let totalBeds = 0;
    let occupiedBeds = 0;

    for (const [departmentId, department] of this.departments.entries()) {
      const departmentBeds = this.resourceManager.getResourcesByPool(departmentId)
        .filter(r => r.subtype === 'bed');

      totalBeds += departmentBeds.length;
      occupiedBeds += departmentBeds.filter(b => b.available === 0).length;
    }

    const occupancyRate = totalBeds > 0 ? occupiedBeds / totalBeds : 0;

    this.statistics.bedOccupancy.push({
      time,
      totalBeds,
      occupiedBeds,
      occupancyRate
    });

    // Collect resource utilization
    for (const resourceType of ['doctors', 'nurses', 'beds', 'ventilators']) {
      if (!this.statistics.resourceUtilization[resourceType]) {
        this.statistics.resourceUtilization[resourceType] = [];
      }

      const resources = this.resourceManager.getAvailableResources(resourceType, 1000, false);
      const total = resources.length;
      const inUse = resources.filter(r => r.available === 0).length;
      const utilizationRate = total > 0 ? inUse / total : 0;

      this.statistics.resourceUtilization[resourceType].push({
        time,
        total,
        inUse,
        utilizationRate
      });
    }
  }

  /**
   * Calculate simulation results
   * @returns {Object} - Simulation results
   */
  calculateResults() {
    const stats = this.statistics;

    // Calculate average wait times
    const avgWaitTimeEmergency = stats.waitTimes.emergency.length > 0 ?
      stats.waitTimes.emergency.reduce((sum, time) => sum + time, 0) / stats.waitTimes.emergency.length : 0;

    const avgWaitTimeUrgent = stats.waitTimes.urgent.length > 0 ?
      stats.waitTimes.urgent.reduce((sum, time) => sum + time, 0) / stats.waitTimes.urgent.length : 0;

    const avgWaitTimeNonUrgent = stats.waitTimes.nonUrgent.length > 0 ?
      stats.waitTimes.nonUrgent.reduce((sum, time) => sum + time, 0) / stats.waitTimes.nonUrgent.length : 0;

    // Calculate average length of stay
    const avgLengthOfStay = stats.lengthOfStay.length > 0 ?
      stats.lengthOfStay.reduce((sum, los) => sum + los, 0) / stats.lengthOfStay.length : 0;

    // Calculate average bed occupancy
    const avgBedOccupancy = stats.bedOccupancy.length > 0 ?
      stats.bedOccupancy.reduce((sum, data) => sum + data.occupancyRate, 0) / stats.bedOccupancy.length : 0;

    // Calculate resource utilization
    const resourceUtilization = {};

    for (const [resourceType, data] of Object.entries(stats.resourceUtilization)) {
      resourceUtilization[resourceType] = data.length > 0 ?
        data.reduce((sum, item) => sum + item.utilizationRate, 0) / data.length : 0;
    }

    return {
      patientFlow: {
        arrivals: stats.arrivals,
        discharges: stats.discharges,
        currentPatients: stats.arrivals.total - stats.discharges.total
      },
      waitTimes: {
        emergency: avgWaitTimeEmergency,
        urgent: avgWaitTimeUrgent,
        nonUrgent: avgWaitTimeNonUrgent,
        overall: (avgWaitTimeEmergency + avgWaitTimeUrgent + avgWaitTimeNonUrgent) / 3
      },
      lengthOfStay: {
        average: avgLengthOfStay,
        min: Math.min(...stats.lengthOfStay, Infinity),
        max: Math.max(...stats.lengthOfStay, 0)
      },
      bedOccupancy: {
        average: avgBedOccupancy,
        peak: Math.max(...stats.bedOccupancy.map(data => data.occupancyRate), 0)
      },
      resourceUtilization
    };
  }
}

// Export the HospitalSimulator class
export default HospitalSimulator;
