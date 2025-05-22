/**
 * Prediction Service
 * Provides prediction services for the simulators
 */
import { SimpleRegressionModel, TimeSeriesModel } from './MLIntegration.js';
import { 
  normalize, 
  denormalize, 
  createTimeSeriesFeatures, 
  exponentialMovingAverage 
} from './DataPreprocessing.js';

/**
 * Prediction Service class
 * Manages models and provides prediction services
 */
class PredictionService {
  /**
   * Constructor for the PredictionService class
   * @param {Object} options - Service options
   */
  constructor(options = {}) {
    this.models = new Map();
    this.defaultModel = options.defaultModel || null;
    this.logger = options.logger || console;
  }

  /**
   * Register a model with the service
   * @param {string} modelId - Model ID
   * @param {Object} model - Model instance
   * @param {boolean} setAsDefault - Whether to set this model as the default
   * @returns {boolean} - Whether the model was registered successfully
   */
  registerModel(modelId, model, setAsDefault = false) {
    if (this.models.has(modelId)) {
      this.logger.warn(`Model with ID ${modelId} already exists`);
      return false;
    }
    
    this.models.set(modelId, model);
    
    if (setAsDefault || this.models.size === 1) {
      this.defaultModel = modelId;
    }
    
    return true;
  }

  /**
   * Get a model by ID
   * @param {string} modelId - Model ID
   * @returns {Object} - Model instance
   */
  getModel(modelId) {
    if (!modelId && this.defaultModel) {
      return this.models.get(this.defaultModel);
    }
    
    if (!this.models.has(modelId)) {
      throw new Error(`Model with ID ${modelId} not found`);
    }
    
    return this.models.get(modelId);
  }

  /**
   * Make a prediction using a model
   * @param {Object} input - Input data
   * @param {string} modelId - Model ID
   * @returns {Promise} - Promise that resolves with the prediction
   */
  async predict(input, modelId = null) {
    const model = this.getModel(modelId);
    
    try {
      return await model.predict(input);
    } catch (error) {
      this.logger.error(`Error making prediction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Make a time series forecast
   * @param {Array} history - Historical data
   * @param {Object} options - Forecast options
   * @param {string} options.modelId - Model ID
   * @param {number} options.horizon - Forecast horizon
   * @returns {Promise} - Promise that resolves with the forecast
   */
  async forecast(history, options = {}) {
    const modelId = options.modelId || null;
    const model = this.getModel(modelId);
    
    if (model.type !== 'time_series') {
      throw new Error(`Model ${modelId || this.defaultModel} is not a time series model`);
    }
    
    try {
      return await model.forecast(history);
    } catch (error) {
      this.logger.error(`Error making forecast: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a patient arrival rate prediction model
   * @param {Array} historicalData - Historical patient arrival data
   * @returns {Object} - Model instance
   */
  createArrivalRateModel(historicalData) {
    // Create a time series model for patient arrivals
    const model = new TimeSeriesModel({
      name: 'patient_arrival_rate',
      historyLength: 24, // Use 24 hours of history
      forecastHorizon: 24, // Forecast 24 hours ahead
      features: ['hour', 'day_of_week'],
      targets: ['arrival_rate']
    });
    
    // Train the model
    model.train(historicalData)
      .then(() => {
        this.logger.info('Patient arrival rate model trained successfully');
        this.registerModel('arrival_rate', model);
      })
      .catch(error => {
        this.logger.error(`Error training patient arrival rate model: ${error.message}`);
      });
    
    return model;
  }

  /**
   * Create a length of stay prediction model
   * @param {Array} patientData - Historical patient data
   * @returns {Object} - Model instance
   */
  createLengthOfStayModel(patientData) {
    // Extract features and target
    const features = patientData.map(patient => [
      patient.age,
      patient.acuityLevel,
      patient.comorbidities.length
    ]);
    
    const targets = patientData.map(patient => patient.lengthOfStay);
    
    // Create a regression model for length of stay
    const model = new SimpleRegressionModel({
      name: 'length_of_stay',
      features: ['age', 'acuity_level', 'comorbidities'],
      targets: ['length_of_stay']
    });
    
    // Train the model
    model.train(features, targets)
      .then(() => {
        this.logger.info('Length of stay model trained successfully');
        this.registerModel('length_of_stay', model);
      })
      .catch(error => {
        this.logger.error(`Error training length of stay model: ${error.message}`);
      });
    
    return model;
  }

  /**
   * Create a resource utilization prediction model
   * @param {Array} utilizationData - Historical resource utilization data
   * @param {string} resourceType - Resource type
   * @returns {Object} - Model instance
   */
  createResourceUtilizationModel(utilizationData, resourceType) {
    // Create a time series model for resource utilization
    const model = new TimeSeriesModel({
      name: `${resourceType}_utilization`,
      historyLength: 24, // Use 24 hours of history
      forecastHorizon: 24, // Forecast 24 hours ahead
      features: ['hour', 'day_of_week'],
      targets: ['utilization_rate']
    });
    
    // Train the model
    model.train(utilizationData)
      .then(() => {
        this.logger.info(`${resourceType} utilization model trained successfully`);
        this.registerModel(`${resourceType}_utilization`, model);
      })
      .catch(error => {
        this.logger.error(`Error training ${resourceType} utilization model: ${error.message}`);
      });
    
    return model;
  }

  /**
   * Create a waiting time prediction model
   * @param {Array} waitingTimeData - Historical waiting time data
   * @returns {Object} - Model instance
   */
  createWaitingTimeModel(waitingTimeData) {
    // Extract features and target
    const features = waitingTimeData.map(data => [
      data.patientCount,
      data.doctorCount,
      data.nurseCount,
      data.bedCount
    ]);
    
    const targets = waitingTimeData.map(data => data.waitingTime);
    
    // Create a regression model for waiting time
    const model = new SimpleRegressionModel({
      name: 'waiting_time',
      features: ['patient_count', 'doctor_count', 'nurse_count', 'bed_count'],
      targets: ['waiting_time']
    });
    
    // Train the model
    model.train(features, targets)
      .then(() => {
        this.logger.info('Waiting time model trained successfully');
        this.registerModel('waiting_time', model);
      })
      .catch(error => {
        this.logger.error(`Error training waiting time model: ${error.message}`);
      });
    
    return model;
  }

  /**
   * Predict patient arrival rates
   * @param {Object} context - Simulation context
   * @param {number} horizon - Prediction horizon in hours
   * @returns {Promise} - Promise that resolves with the predicted arrival rates
   */
  async predictArrivalRates(context, horizon = 24) {
    const model = this.getModel('arrival_rate');
    
    if (!model) {
      throw new Error('Arrival rate model not found');
    }
    
    // Get historical arrival rates
    const history = context.hourlyPatientArrivals || [];
    
    // Make forecast
    return await model.forecast(history);
  }

  /**
   * Predict length of stay for a patient
   * @param {Object} patient - Patient object
   * @returns {Promise} - Promise that resolves with the predicted length of stay
   */
  async predictLengthOfStay(patient) {
    const model = this.getModel('length_of_stay');
    
    if (!model) {
      throw new Error('Length of stay model not found');
    }
    
    // Create input features
    const input = [
      patient.age,
      patient.acuityLevel,
      patient.comorbidities.length
    ];
    
    // Make prediction
    return await model.predict(input);
  }

  /**
   * Predict resource utilization
   * @param {Object} context - Simulation context
   * @param {string} resourceType - Resource type
   * @param {number} horizon - Prediction horizon in hours
   * @returns {Promise} - Promise that resolves with the predicted utilization
   */
  async predictResourceUtilization(context, resourceType, horizon = 24) {
    const modelId = `${resourceType}_utilization`;
    const model = this.getModel(modelId);
    
    if (!model) {
      throw new Error(`${resourceType} utilization model not found`);
    }
    
    // Get historical utilization
    let history;
    if (resourceType === 'ed_beds') {
      history = context.hourlyEdOccupancy || [];
    } else if (resourceType === 'ward_beds') {
      history = context.hourlyWardOccupancy || [];
    } else {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }
    
    // Make forecast
    return await model.forecast(history);
  }

  /**
   * Predict waiting time
   * @param {Object} context - Simulation context
   * @returns {Promise} - Promise that resolves with the predicted waiting time
   */
  async predictWaitingTime(context) {
    const model = this.getModel('waiting_time');
    
    if (!model) {
      throw new Error('Waiting time model not found');
    }
    
    // Create input features
    const input = [
      context.entities.length,
      context.getResource('doctors_day').capacity,
      context.getResource('nurses_day').capacity,
      context.getResource('ed_beds').capacity
    ];
    
    // Make prediction
    return await model.predict(input);
  }
}

// Export the class
export default PredictionService;
