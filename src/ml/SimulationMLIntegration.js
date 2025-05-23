/**
 * SimulationMLIntegration.js
 * Integrates machine learning models with the simulation
 */

import HealthcarePredictionService from './HealthcarePredictionService.js';
import Logger from '../utils/Logger.js';

/**
 * Simulation ML Integration class
 * Provides integration between simulation and machine learning models
 */
class SimulationMLIntegration {
  /**
   * Constructor for the SimulationMLIntegration class
   * @param {Object} simulator - Simulator instance
   * @param {Object} options - Integration options
   */
  constructor(simulator, options = {}) {
    this.simulator = simulator;
    this.predictionService = options.predictionService || new HealthcarePredictionService(options);
    this.logger = options.logger || new Logger({ level: 'info' });
    this.enabled = options.enabled !== false;
    this.collectTrainingData = options.collectTrainingData !== false;
    this.trainingDataBuffer = {
      patients: [],
      waitTimes: [],
      resourceUtilization: new Map(),
      patientFlow: []
    };
    this.predictionCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 60; // Cache timeout in minutes
    this.initialized = false;
  }
  
  /**
   * Initialize the integration
   * @param {Object} options - Initialization options
   * @returns {Promise} - Promise that resolves when the integration is initialized
   */
  async initialize(options = {}) {
    this.logger.info('ml_integration', 'Initializing ML integration', null, options);
    
    // Initialize prediction service
    await this.predictionService.initialize(options);
    
    // Register event handlers
    this.registerEventHandlers();
    
    this.initialized = true;
    return true;
  }
  
  /**
   * Register event handlers
   */
  registerEventHandlers() {
    if (!this.simulator || !this.simulator.on) {
      this.logger.warn('ml_integration', 'Simulator does not support event handlers');
      return;
    }
    
    // Patient events
    this.simulator.on('patientArrival', this.handlePatientArrival.bind(this));
    this.simulator.on('patientDischarge', this.handlePatientDischarge.bind(this));
    this.simulator.on('patientTransfer', this.handlePatientTransfer.bind(this));
    
    // Resource events
    this.simulator.on('resourceAllocation', this.handleResourceAllocation.bind(this));
    this.simulator.on('resourceRelease', this.handleResourceRelease.bind(this));
    
    // Simulation events
    this.simulator.on('simulationStep', this.handleSimulationStep.bind(this));
    this.simulator.on('simulationEnd', this.handleSimulationEnd.bind(this));
  }
  
  /**
   * Handle patient arrival event
   * @param {Object} event - Event data
   */
  handlePatientArrival(event) {
    if (!this.enabled) return;
    
    const { patient, time } = event;
    
    // Predict length of stay
    this.predictLengthOfStay(patient)
      .then(los => {
        patient.expectedLOS = los;
        this.logger.debug('ml_integration', `Predicted LOS for patient ${patient.id}: ${los.toFixed(2)} days`, patient);
      })
      .catch(error => {
        this.logger.error('ml_integration', `Error predicting LOS: ${error.message}`, patient);
      });
    
    // Predict readmission risk
    this.predictReadmissionRisk(patient)
      .then(risk => {
        if (!patient.riskFactors) {
          patient.riskFactors = {};
        }
        patient.riskFactors.readmissionRisk = risk;
        this.logger.debug('ml_integration', `Predicted readmission risk for patient ${patient.id}: ${(risk * 100).toFixed(2)}%`, patient);
      })
      .catch(error => {
        this.logger.error('ml_integration', `Error predicting readmission risk: ${error.message}`, patient);
      });
    
    // Collect training data
    if (this.collectTrainingData) {
      this.trainingDataBuffer.patients.push({
        ...patient,
        arrivalTime: time
      });
      
      // Add to patient flow data
      const hour = Math.floor(time / 60) % 24;
      const day = Math.floor(time / (60 * 24)) % 7;
      
      this.trainingDataBuffer.patientFlow.push({
        time,
        hourOfDay: hour,
        dayOfWeek: day,
        arrivalRate: 1, // Single arrival
        isHoliday: this.isHoliday(time),
        weatherCondition: this.getWeatherCondition(time)
      });
    }
  }
  
  /**
   * Handle patient discharge event
   * @param {Object} event - Event data
   */
  handlePatientDischarge(event) {
    if (!this.enabled) return;
    
    const { patient, time } = event;
    
    // Collect training data
    if (this.collectTrainingData && patient.arrivalTime) {
      const los = (time - patient.arrivalTime) / (60 * 24); // Convert to days
      
      // Update patient data
      const patientIndex = this.trainingDataBuffer.patients.findIndex(p => p.id === patient.id);
      if (patientIndex >= 0) {
        this.trainingDataBuffer.patients[patientIndex].totalLengthOfStay = los;
        this.trainingDataBuffer.patients[patientIndex].dischargeTime = time;
        
        // Add to prediction service training data
        this.predictionService.addTrainingData('length_of_stay', [this.trainingDataBuffer.patients[patientIndex]]);
      }
    }
  }
  
  /**
   * Handle patient transfer event
   * @param {Object} event - Event data
   */
  handlePatientTransfer(event) {
    if (!this.enabled) return;
    
    const { patient, fromLocation, toLocation, time } = event;
    
    // Collect training data
    if (this.collectTrainingData) {
      // Update patient data
      const patientIndex = this.trainingDataBuffer.patients.findIndex(p => p.id === patient.id);
      if (patientIndex >= 0) {
        if (!this.trainingDataBuffer.patients[patientIndex].transfers) {
          this.trainingDataBuffer.patients[patientIndex].transfers = [];
        }
        
        this.trainingDataBuffer.patients[patientIndex].transfers.push({
          fromLocation,
          toLocation,
          time
        });
      }
    }
  }
  
  /**
   * Handle resource allocation event
   * @param {Object} event - Event data
   */
  handleResourceAllocation(event) {
    if (!this.enabled) return;
    
    const { resource, entity, amount, time } = event;
    
    // Collect training data
    if (this.collectTrainingData) {
      // Add to wait time data if this is a patient being allocated a resource
      if (entity && entity.type === 'patient' && entity.arrivalTime) {
        const waitTime = time - entity.arrivalTime;
        
        this.trainingDataBuffer.waitTimes.push({
          patientId: entity.id,
          resourceType: resource.type,
          resourceId: resource.id,
          waitTime,
          patientCount: this.simulator.getPatientCount(),
          staffingLevel: this.getStaffingLevel(),
          acuityLevel: entity.acuityLevel,
          hourOfDay: Math.floor(time / 60) % 24,
          dayOfWeek: Math.floor(time / (60 * 24)) % 7,
          bedUtilization: this.getBedUtilization()
        });
        
        // Add to prediction service training data
        this.predictionService.addTrainingData('wait_time', [this.trainingDataBuffer.waitTimes[this.trainingDataBuffer.waitTimes.length - 1]]);
      }
      
      // Add to resource utilization data
      const resourceType = resource.type;
      if (!this.trainingDataBuffer.resourceUtilization.has(resourceType)) {
        this.trainingDataBuffer.resourceUtilization.set(resourceType, []);
      }
      
      const utilizationRate = resource.getUtilizationRate ? resource.getUtilizationRate() : (resource.capacity && resource.available ? (resource.capacity - resource.available) / resource.capacity : 0.5);
      
      this.trainingDataBuffer.resourceUtilization.get(resourceType).push({
        time,
        resourceId: resource.id,
        utilizationRate,
        hourOfDay: Math.floor(time / 60) % 24,
        dayOfWeek: Math.floor(time / (60 * 24)) % 7,
        patientCount: this.simulator.getPatientCount(),
        acuityMix: this.getAcuityMix(),
        staffingLevel: this.getStaffingLevel()
      });
      
      // Add to prediction service training data
      this.predictionService.addTrainingData(`${resourceType}_utilization`, [this.trainingDataBuffer.resourceUtilization.get(resourceType)[this.trainingDataBuffer.resourceUtilization.get(resourceType).length - 1]]);
    }
  }
  
  /**
   * Handle resource release event
   * @param {Object} event - Event data
   */
  handleResourceRelease(event) {
    if (!this.enabled) return;
    
    const { resource, entity, time } = event;
    
    // Collect training data
    if (this.collectTrainingData) {
      // Add to resource utilization data
      const resourceType = resource.type;
      if (!this.trainingDataBuffer.resourceUtilization.has(resourceType)) {
        this.trainingDataBuffer.resourceUtilization.set(resourceType, []);
      }
      
      const utilizationRate = resource.getUtilizationRate ? resource.getUtilizationRate() : (resource.capacity && resource.available ? (resource.capacity - resource.available) / resource.capacity : 0.5);
      
      this.trainingDataBuffer.resourceUtilization.get(resourceType).push({
        time,
        resourceId: resource.id,
        utilizationRate,
        hourOfDay: Math.floor(time / 60) % 24,
        dayOfWeek: Math.floor(time / (60 * 24)) % 7,
        patientCount: this.simulator.getPatientCount(),
        acuityMix: this.getAcuityMix(),
        staffingLevel: this.getStaffingLevel()
      });
    }
  }
  
  /**
   * Handle simulation step event
   * @param {Object} event - Event data
   */
  handleSimulationStep(event) {
    if (!this.enabled) return;
    
    const { time, step } = event;
    
    // Every hour, predict resource utilization
    if (step % 60 === 0) {
      this.predictResourceUtilization();
    }
    
    // Every 6 hours, predict patient flow
    if (step % (60 * 6) === 0) {
      this.predictPatientFlow();
    }
    
    // Every 24 hours, train models with collected data
    if (step % (60 * 24) === 0 && this.collectTrainingData) {
      this.trainModels();
    }
  }
  
  /**
   * Handle simulation end event
   * @param {Object} event - Event data
   */
  handleSimulationEnd(event) {
    if (!this.enabled) return;
    
    // Train models with all collected data
    if (this.collectTrainingData) {
      this.trainModels();
    }
  }
  
  /**
   * Predict length of stay for a patient
   * @param {Object} patient - Patient object
   * @returns {Promise} - Promise that resolves with the predicted length of stay
   */
  async predictLengthOfStay(patient) {
    if (!this.initialized) {
      throw new Error('ML integration not initialized');
    }
    
    return this.predictionService.predictLengthOfStay(patient);
  }
  
  /**
   * Predict readmission risk for a patient
   * @param {Object} patient - Patient object
   * @returns {Promise} - Promise that resolves with the predicted readmission risk
   */
  async predictReadmissionRisk(patient) {
    if (!this.initialized) {
      throw new Error('ML integration not initialized');
    }
    
    return this.predictionService.predictReadmissionRisk(patient);
  }
  
  /**
   * Predict resource utilization
   * @param {string} resourceType - Resource type (optional, predicts all if not specified)
   * @returns {Promise} - Promise that resolves with the predicted utilization
   */
  async predictResourceUtilization(resourceType = null) {
    if (!this.initialized) {
      throw new Error('ML integration not initialized');
    }
    
    const resourceTypes = resourceType ? [resourceType] : ['ed_beds', 'ward_beds', 'doctors', 'nurses'];
    const predictions = {};
    
    for (const type of resourceTypes) {
      // Get historical data
      const history = this.getResourceUtilizationHistory(type);
      
      // Make prediction
      const forecast = await this.predictionService.predictResourceUtilization(type, history);
      
      predictions[type] = forecast;
      
      // Update simulator with predictions
      if (this.simulator.updateResourcePredictions) {
        this.simulator.updateResourcePredictions(type, forecast);
      }
    }
    
    return predictions;
  }
  
  /**
   * Predict wait time
   * @param {Object} context - Context object with current state (optional, uses current state if not specified)
   * @returns {Promise} - Promise that resolves with the predicted wait time
   */
  async predictWaitTime(context = null) {
    if (!this.initialized) {
      throw new Error('ML integration not initialized');
    }
    
    // Use provided context or create one from current state
    const ctx = context || {
      patientCount: this.simulator.getPatientCount(),
      staffingLevel: this.getStaffingLevel(),
      acuityLevel: 3, // Default acuity level
      hourOfDay: Math.floor(this.simulator.getCurrentTime() / 60) % 24,
      dayOfWeek: Math.floor(this.simulator.getCurrentTime() / (60 * 24)) % 7,
      bedUtilization: this.getBedUtilization()
    };
    
    return this.predictionService.predictWaitTime(ctx);
  }
  
  /**
   * Predict patient flow
   * @returns {Promise} - Promise that resolves with the predicted patient flow
   */
  async predictPatientFlow() {
    if (!this.initialized) {
      throw new Error('ML integration not initialized');
    }
    
    // Get historical data
    const history = this.getPatientFlowHistory();
    
    // Make prediction
    const forecast = await this.predictionService.predictPatientFlow(history);
    
    // Update simulator with predictions
    if (this.simulator.updatePatientFlowPredictions) {
      this.simulator.updatePatientFlowPredictions(forecast);
    }
    
    return forecast;
  }
  
  /**
   * Train models with collected data
   */
  async trainModels() {
    if (!this.initialized || !this.collectTrainingData) {
      return;
    }
    
    this.logger.info('ml_integration', 'Training models with collected data');
    
    // Train length of stay model
    if (this.trainingDataBuffer.patients.length > 0) {
      try {
        await this.predictionService.trainModel('length_of_stay');
      } catch (error) {
        this.logger.error('ml_integration', `Error training length of stay model: ${error.message}`);
      }
    }
    
    // Train wait time model
    if (this.trainingDataBuffer.waitTimes.length > 0) {
      try {
        await this.predictionService.trainModel('wait_time');
      } catch (error) {
        this.logger.error('ml_integration', `Error training wait time model: ${error.message}`);
      }
    }
    
    // Train resource utilization models
    for (const [resourceType, data] of this.trainingDataBuffer.resourceUtilization.entries()) {
      if (data.length > 0) {
        try {
          await this.predictionService.trainModel(`${resourceType}_utilization`);
        } catch (error) {
          this.logger.error('ml_integration', `Error training ${resourceType} utilization model: ${error.message}`);
        }
      }
    }
    
    // Train patient flow model
    if (this.trainingDataBuffer.patientFlow.length > 0) {
      try {
        await this.predictionService.trainModel('patient_flow');
      } catch (error) {
        this.logger.error('ml_integration', `Error training patient flow model: ${error.message}`);
      }
    }
  }
  
  /**
   * Get resource utilization history
   * @param {string} resourceType - Resource type
   * @returns {Array} - Resource utilization history
   */
  getResourceUtilizationHistory(resourceType) {
    if (!this.trainingDataBuffer.resourceUtilization.has(resourceType)) {
      return [];
    }
    
    return this.trainingDataBuffer.resourceUtilization.get(resourceType).map(data => data.utilizationRate);
  }
  
  /**
   * Get patient flow history
   * @returns {Array} - Patient flow history
   */
  getPatientFlowHistory() {
    // Group by hour
    const hourlyData = new Map();
    
    for (const data of this.trainingDataBuffer.patientFlow) {
      const hourKey = `${Math.floor(data.time / (60 * 24))}_${Math.floor(data.time / 60) % 24}`;
      
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, {
          time: data.time,
          hourOfDay: data.hourOfDay,
          dayOfWeek: data.dayOfWeek,
          arrivalRate: 0,
          isHoliday: data.isHoliday,
          weatherCondition: data.weatherCondition
        });
      }
      
      hourlyData.get(hourKey).arrivalRate += 1;
    }
    
    // Convert to array and sort by time
    return Array.from(hourlyData.values())
      .sort((a, b) => a.time - b.time)
      .map(data => data.arrivalRate);
  }
  
  /**
   * Get staffing level
   * @returns {number} - Staffing level (0-1)
   */
  getStaffingLevel() {
    // Calculate staffing level based on available staff
    const doctors = this.simulator.getResource('doctors_day');
    const nurses = this.simulator.getResource('nurses_day');
    
    if (!doctors || !nurses) {
      return 0.5; // Default value
    }
    
    const doctorLevel = doctors.available / doctors.capacity;
    const nurseLevel = nurses.available / nurses.capacity;
    
    return (doctorLevel + nurseLevel) / 2;
  }
  
  /**
   * Get bed utilization
   * @returns {number} - Bed utilization (0-1)
   */
  getBedUtilization() {
    // Calculate bed utilization
    const edBeds = this.simulator.getResource('ed_beds');
    const wardBeds = this.simulator.getResource('ward_beds');
    
    if (!edBeds || !wardBeds) {
      return 0.5; // Default value
    }
    
    const edUtilization = (edBeds.capacity - edBeds.available) / edBeds.capacity;
    const wardUtilization = (wardBeds.capacity - wardBeds.available) / wardBeds.capacity;
    
    return (edUtilization + wardUtilization) / 2;
  }
  
  /**
   * Get acuity mix
   * @returns {number} - Acuity mix (0-1, higher means more acute)
   */
  getAcuityMix() {
    // Calculate acuity mix of current patients
    const patients = this.simulator.getPatients();
    
    if (!patients || patients.length === 0) {
      return 0.5; // Default value
    }
    
    const totalAcuity = patients.reduce((sum, patient) => sum + (6 - patient.acuityLevel), 0);
    return totalAcuity / (patients.length * 5);
  }
  
  /**
   * Check if a time is a holiday
   * @param {number} time - Simulation time
   * @returns {boolean} - Whether the time is a holiday
   */
  isHoliday(time) {
    // Simple holiday check (every 7th day)
    return Math.floor(time / (60 * 24)) % 7 === 0;
  }
  
  /**
   * Get weather condition
   * @param {number} time - Simulation time
   * @returns {number} - Weather condition (0-1, higher means worse)
   */
  getWeatherCondition(time) {
    // Simple weather condition simulation
    const day = Math.floor(time / (60 * 24));
    return (Math.sin(day * 0.1) + 1) / 2;
  }
}

// Export the class
export default SimulationMLIntegration;
