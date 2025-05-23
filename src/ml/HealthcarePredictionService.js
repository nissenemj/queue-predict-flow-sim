/**
 * HealthcarePredictionService.js
 * Service for managing healthcare prediction models
 */

import PredictionService from './PredictionService.js';
import {
  LengthOfStayModel,
  ReadmissionRiskModel,
  ResourceUtilizationModel,
  WaitTimeModel,
  PatientFlowModel
} from './HealthcarePredictionModels.js';
import Logger from '../utils/Logger.js';

/**
 * Healthcare Prediction Service
 * Manages healthcare-specific prediction models
 */
class HealthcarePredictionService {
  /**
   * Constructor for the HealthcarePredictionService class
   * @param {Object} options - Service options
   */
  constructor(options = {}) {
    this.predictionService = new PredictionService(options);
    this.logger = options.logger || new Logger({ level: 'info' });
    this.models = new Map();
    this.trainingData = new Map();
    this.initialized = false;
  }
  
  /**
   * Initialize the service
   * @param {Object} options - Initialization options
   * @returns {Promise} - Promise that resolves when the service is initialized
   */
  async initialize(options = {}) {
    this.logger.info('prediction', 'Initializing healthcare prediction service', null, options);
    
    // Create models
    await this.createModels(options);
    
    this.initialized = true;
    return true;
  }
  
  /**
   * Create prediction models
   * @param {Object} options - Model creation options
   * @returns {Promise} - Promise that resolves when the models are created
   */
  async createModels(options = {}) {
    // Create length of stay model
    const losModel = new LengthOfStayModel();
    this.models.set('length_of_stay', losModel);
    this.predictionService.registerModel('length_of_stay', losModel);
    
    // Create readmission risk model
    const readmissionModel = new ReadmissionRiskModel();
    this.models.set('readmission_risk', readmissionModel);
    this.predictionService.registerModel('readmission_risk', readmissionModel);
    
    // Create resource utilization models
    const resourceTypes = ['ed_beds', 'ward_beds', 'doctors', 'nurses'];
    for (const resourceType of resourceTypes) {
      const utilizationModel = new ResourceUtilizationModel({ resourceType });
      this.models.set(`${resourceType}_utilization`, utilizationModel);
      this.predictionService.registerModel(`${resourceType}_utilization`, utilizationModel);
    }
    
    // Create wait time model
    const waitTimeModel = new WaitTimeModel();
    this.models.set('wait_time', waitTimeModel);
    this.predictionService.registerModel('wait_time', waitTimeModel);
    
    // Create patient flow model
    const patientFlowModel = new PatientFlowModel();
    this.models.set('patient_flow', patientFlowModel);
    this.predictionService.registerModel('patient_flow', patientFlowModel);
    
    return true;
  }
  
  /**
   * Add training data for a model
   * @param {string} modelId - Model ID
   * @param {Array} data - Training data
   */
  addTrainingData(modelId, data) {
    if (!this.trainingData.has(modelId)) {
      this.trainingData.set(modelId, []);
    }
    
    const currentData = this.trainingData.get(modelId);
    this.trainingData.set(modelId, [...currentData, ...data]);
    
    this.logger.info('prediction', `Added ${data.length} training data points for model ${modelId}`, null, {
      modelId,
      totalDataPoints: this.trainingData.get(modelId).length
    });
  }
  
  /**
   * Train a model
   * @param {string} modelId - Model ID
   * @param {Array} data - Training data (optional, uses stored data if not provided)
   * @returns {Promise} - Promise that resolves when the model is trained
   */
  async trainModel(modelId, data = null) {
    if (!this.models.has(modelId)) {
      throw new Error(`Model with ID ${modelId} not found`);
    }
    
    const model = this.models.get(modelId);
    const trainingData = data || this.trainingData.get(modelId) || [];
    
    if (trainingData.length === 0) {
      throw new Error(`No training data available for model ${modelId}`);
    }
    
    this.logger.info('prediction', `Training model ${modelId} with ${trainingData.length} data points`, null, {
      modelId,
      dataPoints: trainingData.length
    });
    
    try {
      const result = await model.train(trainingData);
      
      this.logger.info('prediction', `Model ${modelId} trained successfully`, null, {
        modelId,
        performance: result
      });
      
      return result;
    } catch (error) {
      this.logger.error('prediction', `Error training model ${modelId}: ${error.message}`, null, {
        modelId,
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Predict length of stay for a patient
   * @param {Object} patient - Patient object
   * @returns {Promise} - Promise that resolves with the predicted length of stay
   */
  async predictLengthOfStay(patient) {
    if (!this.initialized) {
      throw new Error('Healthcare prediction service not initialized');
    }
    
    const model = this.models.get('length_of_stay');
    
    try {
      const prediction = await model.predict(patient);
      
      this.logger.debug('prediction', `Predicted length of stay for patient ${patient.id}: ${prediction.toFixed(2)} days`, patient, {
        prediction
      });
      
      return prediction;
    } catch (error) {
      this.logger.error('prediction', `Error predicting length of stay: ${error.message}`, patient, {
        error: error.message
      });
      
      // Fallback to a simple calculation
      const baseStay = {
        1: 5.0, // Critical
        2: 4.0, // Severe
        3: 3.0, // Moderate
        4: 2.0, // Mild
        5: 1.0  // Minor
      };
      
      const base = baseStay[patient.acuityLevel] || 3.0;
      const ageFactor = patient.age >= 65 ? 1.5 : patient.age <= 5 ? 1.3 : 1.0;
      const comorbidityFactor = 1 + (patient.comorbidities ? patient.comorbidities.length * 0.2 : 0);
      
      return base * ageFactor * comorbidityFactor;
    }
  }
  
  /**
   * Predict readmission risk for a patient
   * @param {Object} patient - Patient object
   * @returns {Promise} - Promise that resolves with the predicted readmission risk
   */
  async predictReadmissionRisk(patient) {
    if (!this.initialized) {
      throw new Error('Healthcare prediction service not initialized');
    }
    
    const model = this.models.get('readmission_risk');
    
    try {
      const prediction = await model.predict(patient);
      
      this.logger.debug('prediction', `Predicted readmission risk for patient ${patient.id}: ${(prediction * 100).toFixed(2)}%`, patient, {
        prediction
      });
      
      return prediction;
    } catch (error) {
      this.logger.error('prediction', `Error predicting readmission risk: ${error.message}`, patient, {
        error: error.message
      });
      
      // Fallback to a simple calculation
      const baseRisk = {
        1: 0.25, // Critical
        2: 0.20, // Severe
        3: 0.15, // Moderate
        4: 0.10, // Mild
        5: 0.05  // Minor
      };
      
      const base = baseRisk[patient.acuityLevel] || 0.15;
      const ageFactor = patient.age >= 65 ? 1.5 : patient.age <= 5 ? 1.2 : 1.0;
      const comorbidityFactor = 1 + (patient.comorbidities ? patient.comorbidities.length * 0.1 : 0);
      
      return Math.min(0.9, base * ageFactor * comorbidityFactor);
    }
  }
  
  /**
   * Predict resource utilization
   * @param {string} resourceType - Resource type (ed_beds, ward_beds, doctors, nurses)
   * @param {Array} history - Historical utilization data
   * @param {number} horizon - Forecast horizon in hours
   * @returns {Promise} - Promise that resolves with the predicted utilization
   */
  async predictResourceUtilization(resourceType, history, horizon = 24) {
    if (!this.initialized) {
      throw new Error('Healthcare prediction service not initialized');
    }
    
    const modelId = `${resourceType}_utilization`;
    if (!this.models.has(modelId)) {
      throw new Error(`Model with ID ${modelId} not found`);
    }
    
    const model = this.models.get(modelId);
    
    try {
      const forecast = await model.forecast(history);
      
      this.logger.debug('prediction', `Predicted ${resourceType} utilization for next ${horizon} hours`, null, {
        resourceType,
        horizon,
        forecast: forecast.slice(0, horizon)
      });
      
      return forecast.slice(0, horizon);
    } catch (error) {
      this.logger.error('prediction', `Error predicting ${resourceType} utilization: ${error.message}`, null, {
        error: error.message,
        resourceType
      });
      
      // Fallback to a simple forecast
      return history.slice(-horizon).map(h => typeof h === 'number' ? h : h.utilizationRate || 0.5);
    }
  }
  
  /**
   * Predict wait time
   * @param {Object} context - Context object with current state
   * @returns {Promise} - Promise that resolves with the predicted wait time
   */
  async predictWaitTime(context) {
    if (!this.initialized) {
      throw new Error('Healthcare prediction service not initialized');
    }
    
    const model = this.models.get('wait_time');
    
    try {
      const prediction = await model.predict(context);
      
      this.logger.debug('prediction', `Predicted wait time: ${prediction.toFixed(2)} minutes`, null, {
        prediction,
        context
      });
      
      return prediction;
    } catch (error) {
      this.logger.error('prediction', `Error predicting wait time: ${error.message}`, null, {
        error: error.message,
        context
      });
      
      // Fallback to a simple calculation
      const baseWait = 30; // 30 minutes base wait time
      const patientFactor = 1 + (context.patientCount || 0) * 0.1;
      const staffFactor = Math.max(0.5, 1 - (context.staffingLevel || 0) * 0.1);
      const utilizationFactor = 1 + (context.bedUtilization || 0.5) * 2;
      
      return baseWait * patientFactor * staffFactor * utilizationFactor;
    }
  }
  
  /**
   * Predict patient flow
   * @param {Array} history - Historical patient flow data
   * @param {number} horizon - Forecast horizon in hours
   * @returns {Promise} - Promise that resolves with the predicted patient flow
   */
  async predictPatientFlow(history, horizon = 24) {
    if (!this.initialized) {
      throw new Error('Healthcare prediction service not initialized');
    }
    
    const model = this.models.get('patient_flow');
    
    try {
      const forecast = await model.forecast(history);
      
      this.logger.debug('prediction', `Predicted patient flow for next ${horizon} hours`, null, {
        horizon,
        forecast: forecast.slice(0, horizon)
      });
      
      return forecast.slice(0, horizon);
    } catch (error) {
      this.logger.error('prediction', `Error predicting patient flow: ${error.message}`, null, {
        error: error.message
      });
      
      // Fallback to a simple forecast
      return history.slice(-horizon).map(h => typeof h === 'number' ? h : h.arrivalRate || 5);
    }
  }
}

// Export the class
export default HealthcarePredictionService;
