/**
 * HealthcarePredictionModels.js
 * Specialized prediction models for healthcare applications
 */

import { MLModel, SimpleRegressionModel, TimeSeriesModel } from './MLIntegration.js';
import {
  normalize,
  denormalize,
  minMaxScale,
  trainTestSplit,
  createTimeSeriesFeatures
} from './DataPreprocessing.js';

/**
 * Base class for healthcare prediction models
 */
class HealthcarePredictionModel extends MLModel {
  /**
   * Constructor for the HealthcarePredictionModel class
   * @param {Object} options - Model options
   */
  constructor(options = {}) {
    super({
      name: options.name || 'healthcare_model',
      type: options.type || 'healthcare',
      features: options.features || [],
      targets: options.targets || [],
      metadata: {
        domain: 'healthcare',
        ...options.metadata
      }
    });

    this.modelType = options.modelType || 'regression';
    this.internalModel = null;
    this.featureScalers = new Map();
    this.targetScalers = new Map();
  }

  /**
   * Preprocess input data
   * @param {Array|Object} input - Input data
   * @returns {Array} - Preprocessed data
   * @protected
   */
  preprocess(input) {
    // Convert input to array if it's an object
    const features = Array.isArray(input) ? input : this.features.map(f => input[f]);

    // Scale features if scalers are available
    const scaledFeatures = [];
    for (let i = 0; i < features.length; i++) {
      const featureName = this.features[i];
      if (this.featureScalers.has(featureName)) {
        const scaler = this.featureScalers.get(featureName);
        scaledFeatures.push((features[i] - scaler.mean) / scaler.stdDev);
      } else {
        scaledFeatures.push(features[i]);
      }
    }

    return scaledFeatures;
  }

  /**
   * Postprocess output data
   * @param {Array|number} output - Output data
   * @returns {Array|number} - Postprocessed data
   * @protected
   */
  postprocess(output) {
    // If no target scalers, return as is
    if (this.targetScalers.size === 0) {
      return output;
    }

    // If output is a single value
    if (typeof output === 'number') {
      const targetName = this.targets[0];
      if (this.targetScalers.has(targetName)) {
        const scaler = this.targetScalers.get(targetName);
        return output * scaler.stdDev + scaler.mean;
      }
      return output;
    }

    // If output is an array
    const postprocessedOutput = [];
    for (let i = 0; i < output.length; i++) {
      const targetName = this.targets[i];
      if (this.targetScalers.has(targetName)) {
        const scaler = this.targetScalers.get(targetName);
        postprocessedOutput.push(output[i] * scaler.stdDev + scaler.mean);
      } else {
        postprocessedOutput.push(output[i]);
      }
    }

    return postprocessedOutput;
  }
}

/**
 * Length of Stay prediction model
 */
class LengthOfStayModel extends HealthcarePredictionModel {
  /**
   * Constructor for the LengthOfStayModel class
   * @param {Object} options - Model options
   */
  constructor(options = {}) {
    super({
      name: options.name || 'length_of_stay_model',
      type: 'regression',
      features: options.features || [
        'age',
        'acuityLevel',
        'comorbidityCount',
        'isEmergency',
        'arrivalHour',
        'dayOfWeek'
      ],
      targets: ['lengthOfStay'],
      metadata: {
        description: 'Predicts patient length of stay in days',
        ...options.metadata
      },
      modelType: 'regression'
    });

    // Create internal regression model
    this.internalModel = new SimpleRegressionModel({
      name: 'los_regression',
      features: this.features,
      targets: this.targets
    });
  }

  /**
   * Train the model on patient data
   * @param {Array} patientData - Array of patient objects
   * @returns {Promise} - Promise that resolves when the model is trained
   */
  async train(patientData) {
    // Extract features and target
    const X = [];
    const y = [];

    for (const patient of patientData) {
      // Create feature vector
      const features = [
        patient.age,
        patient.acuityLevel,
        patient.comorbidities ? patient.comorbidities.length : 0,
        patient.isEmergency ? 1 : 0,
        patient.arrivalTime ? (patient.arrivalTime % 24) / 24 : 0.5, // Normalize hour to 0-1
        patient.arrivalTime ? (Math.floor(patient.arrivalTime / 24) % 7) / 7 : 0.5 // Normalize day to 0-1
      ];

      X.push(features);
      y.push(patient.totalLengthOfStay || patient.expectedLOS || 0);
    }

    // Split data into training and testing sets
    const { X_train, y_train, X_test, y_test } = trainTestSplit(X, y, { testSize: 0.2 });

    // Normalize features
    for (let i = 0; i < this.features.length; i++) {
      const featureValues = X_train.map(x => x[i]);
      const { params } = normalize(featureValues);
      this.featureScalers.set(this.features[i], params);

      // Apply normalization to training data
      for (let j = 0; j < X_train.length; j++) {
        X_train[j][i] = (X_train[j][i] - params.mean) / params.stdDev;
      }

      // Apply normalization to testing data
      for (let j = 0; j < X_test.length; j++) {
        X_test[j][i] = (X_test[j][i] - params.mean) / params.stdDev;
      }
    }

    // Normalize target
    const { params } = normalize(y_train);
    this.targetScalers.set(this.targets[0], params);

    // Apply normalization to training target
    const normalizedY_train = y_train.map(y => (y - params.mean) / params.stdDev);

    // Apply normalization to testing target
    const normalizedY_test = y_test.map(y => (y - params.mean) / params.stdDev);

    // Train the internal model
    await this.internalModel.train(X_train, normalizedY_train);

    // Evaluate the model
    const predictions = [];
    for (const x of X_test) {
      predictions.push(await this.internalModel.predict(x));
    }

    // Calculate mean squared error
    let mse = 0;
    for (let i = 0; i < predictions.length; i++) {
      mse += Math.pow(predictions[i] - normalizedY_test[i], 2);
    }
    mse /= predictions.length;

    // Update metadata
    this.metadata.updatedAt = new Date();
    this.metadata.performance = {
      mse,
      rmse: Math.sqrt(mse)
    };

    this.isLoaded = true;

    return {
      mse,
      rmse: Math.sqrt(mse)
    };
  }

  /**
   * Make a prediction using the model
   * @param {Object} patient - Patient object
   * @returns {Promise} - Promise that resolves with the predicted length of stay
   */
  async predict(patient) {
    if (!this.isLoaded) {
      await this.load();
    }

    // Create feature vector
    const features = [
      patient.age,
      patient.acuityLevel,
      patient.comorbidities ? patient.comorbidities.length : 0,
      patient.isEmergency ? 1 : 0,
      patient.arrivalTime ? (patient.arrivalTime % 24) / 24 : 0.5, // Normalize hour to 0-1
      patient.arrivalTime ? (Math.floor(patient.arrivalTime / 24) % 7) / 7 : 0.5 // Normalize day to 0-1
    ];

    // Preprocess features
    const preprocessedFeatures = this.preprocess(features);

    // Make prediction
    const prediction = await this.internalModel.predict(preprocessedFeatures);

    // Postprocess prediction
    const postprocessedPrediction = this.postprocess(prediction);

    // Ensure prediction is positive
    return Math.max(0, postprocessedPrediction);
  }
}

/**
 * Readmission Risk prediction model
 */
class ReadmissionRiskModel extends HealthcarePredictionModel {
  /**
   * Constructor for the ReadmissionRiskModel class
   * @param {Object} options - Model options
   */
  constructor(options = {}) {
    super({
      name: options.name || 'readmission_risk_model',
      type: 'classification',
      features: options.features || [
        'age',
        'acuityLevel',
        'comorbidityCount',
        'lengthOfStay',
        'previousAdmissions',
        'dischargeDisposition'
      ],
      targets: ['readmissionRisk'],
      metadata: {
        description: 'Predicts patient readmission risk (0-1)',
        ...options.metadata
      },
      modelType: 'classification'
    });

    // Create internal regression model (for probability)
    this.internalModel = new SimpleRegressionModel({
      name: 'readmission_regression',
      features: this.features,
      targets: this.targets
    });
  }

  /**
   * Train the model on patient data
   * @param {Array} patientData - Array of patient objects
   * @returns {Promise} - Promise that resolves when the model is trained
   */
  async train(patientData) {
    // Extract features and target
    const X = [];
    const y = [];

    for (const patient of patientData) {
      // Create feature vector
      const features = [
        patient.age,
        patient.acuityLevel,
        patient.comorbidities ? patient.comorbidities.length : 0,
        patient.totalLengthOfStay || patient.expectedLOS || 0,
        patient.previousAdmissions || 0,
        this.encodeDischargeDisposition(patient.dischargeDestination || 'home')
      ];

      X.push(features);

      // Use readmissionRisk if available, otherwise calculate based on risk factors
      let readmissionRisk = 0;
      if (patient.riskFactors && patient.riskFactors.readmissionRisk !== undefined) {
        readmissionRisk = patient.riskFactors.readmissionRisk;
      } else {
        // Base risk by acuity level
        const baseRisk = {
          1: 0.25,
          2: 0.20,
          3: 0.15,
          4: 0.10,
          5: 0.05
        };

        const base = baseRisk[patient.acuityLevel] || 0.15;

        // Adjust for comorbidities
        const comorbidityFactor = 1 + (patient.comorbidities ? patient.comorbidities.length * 0.1 : 0);

        // Adjust for age
        const ageFactor = patient.age >= 65 ? 1.5 : patient.age <= 5 ? 1.2 : 1.0;

        // Calculate final risk, capped at 0.9
        readmissionRisk = Math.min(0.9, base * comorbidityFactor * ageFactor);
      }

      y.push(readmissionRisk);
    }

    // Split data into training and testing sets
    const { X_train, y_train, X_test, y_test } = trainTestSplit(X, y, { testSize: 0.2 });

    // Normalize features
    for (let i = 0; i < this.features.length; i++) {
      const featureValues = X_train.map(x => x[i]);
      const { params } = normalize(featureValues);
      this.featureScalers.set(this.features[i], params);

      // Apply normalization to training data
      for (let j = 0; j < X_train.length; j++) {
        X_train[j][i] = (X_train[j][i] - params.mean) / params.stdDev;
      }

      // Apply normalization to testing data
      for (let j = 0; j < X_test.length; j++) {
        X_test[j][i] = (X_test[j][i] - params.mean) / params.stdDev;
      }
    }

    // Train the internal model
    await this.internalModel.train(X_train, y_train);

    // Evaluate the model
    const predictions = [];
    for (const x of X_test) {
      predictions.push(await this.internalModel.predict(x));
    }

    // Calculate mean squared error
    let mse = 0;
    for (let i = 0; i < predictions.length; i++) {
      mse += Math.pow(predictions[i] - y_test[i], 2);
    }
    mse /= predictions.length;

    // Update metadata
    this.metadata.updatedAt = new Date();
    this.metadata.performance = {
      mse,
      rmse: Math.sqrt(mse)
    };

    this.isLoaded = true;

    return {
      mse,
      rmse: Math.sqrt(mse)
    };
  }

  /**
   * Make a prediction using the model
   * @param {Object} patient - Patient object
   * @returns {Promise} - Promise that resolves with the predicted readmission risk
   */
  async predict(patient) {
    if (!this.isLoaded) {
      await this.load();
    }

    // Create feature vector
    const features = [
      patient.age,
      patient.acuityLevel,
      patient.comorbidities ? patient.comorbidities.length : 0,
      patient.totalLengthOfStay || patient.expectedLOS || 0,
      patient.previousAdmissions || 0,
      this.encodeDischargeDisposition(patient.dischargeDestination || 'home')
    ];

    // Preprocess features
    const preprocessedFeatures = this.preprocess(features);

    // Make prediction
    const prediction = await this.internalModel.predict(preprocessedFeatures);

    // Ensure prediction is between 0 and 1
    return Math.max(0, Math.min(1, prediction));
  }

  /**
   * Encode discharge disposition as a numeric value
   * @param {string} disposition - Discharge disposition
   * @returns {number} - Encoded value
   * @private
   */
  encodeDischargeDisposition(disposition) {
    const dispositions = {
      'home': 0,
      'home_health': 1,
      'skilled_nursing': 2,
      'rehabilitation': 3,
      'long_term_care': 4,
      'against_medical_advice': 5,
      'expired': 6
    };

    return dispositions[disposition] !== undefined ? dispositions[disposition] : 0;
  }
}

/**
 * Resource Utilization prediction model
 */
class ResourceUtilizationModel extends HealthcarePredictionModel {
  /**
   * Constructor for the ResourceUtilizationModel class
   * @param {Object} options - Model options
   */
  constructor(options = {}) {
    super({
      name: options.name || 'resource_utilization_model',
      type: 'time_series',
      features: options.features || [
        'hourOfDay',
        'dayOfWeek',
        'patientCount',
        'acuityMix',
        'staffingLevel'
      ],
      targets: ['utilizationRate'],
      metadata: {
        description: 'Predicts resource utilization rate (0-1)',
        resourceType: options.resourceType || 'bed',
        ...options.metadata
      },
      modelType: 'time_series'
    });

    this.resourceType = options.resourceType || 'bed';
    this.historyLength = options.historyLength || 24;
    this.forecastHorizon = options.forecastHorizon || 24;

    // Create internal time series model
    this.internalModel = new TimeSeriesModel({
      name: `${this.resourceType}_utilization_ts`,
      historyLength: this.historyLength,
      forecastHorizon: this.forecastHorizon,
      features: this.features,
      targets: this.targets
    });
  }

  /**
   * Train the model on utilization data
   * @param {Array} utilizationData - Array of utilization data points
   * @returns {Promise} - Promise that resolves when the model is trained
   */
  async train(utilizationData) {
    // Ensure data is in the correct format
    const formattedData = utilizationData.map(data => {
      if (typeof data === 'number') {
        // If data is just a number, assume it's the utilization rate
        return {
          utilizationRate: data,
          hourOfDay: 0,
          dayOfWeek: 0,
          patientCount: 0,
          acuityMix: 0,
          staffingLevel: 0
        };
      }
      return data;
    });

    // Train the internal model
    await this.internalModel.train(formattedData);

    this.isLoaded = true;

    return {
      weights: this.internalModel.weights,
      seasonality: this.internalModel.seasonality
    };
  }

  /**
   * Make a forecast using the model
   * @param {Array} history - Historical utilization data
   * @returns {Promise} - Promise that resolves with the forecast
   */
  async forecast(history) {
    if (!this.isLoaded) {
      await this.load();
    }

    // Ensure history is in the correct format
    const formattedHistory = history.map(data => {
      if (typeof data === 'number') {
        // If data is just a number, assume it's the utilization rate
        return {
          utilizationRate: data,
          hourOfDay: 0,
          dayOfWeek: 0,
          patientCount: 0,
          acuityMix: 0,
          staffingLevel: 0
        };
      }
      return data;
    });

    // Make forecast
    const forecast = await this.internalModel.forecast(formattedHistory);

    // Ensure forecast values are between 0 and 1
    return forecast.map(value => Math.max(0, Math.min(1, value)));
  }
}

/**
 * Wait Time prediction model
 */
class WaitTimeModel extends HealthcarePredictionModel {
  /**
   * Constructor for the WaitTimeModel class
   * @param {Object} options - Model options
   */
  constructor(options = {}) {
    super({
      name: options.name || 'wait_time_model',
      type: 'regression',
      features: options.features || [
        'patientCount',
        'staffingLevel',
        'acuityLevel',
        'hourOfDay',
        'dayOfWeek',
        'bedUtilization'
      ],
      targets: ['waitTime'],
      metadata: {
        description: 'Predicts patient wait time in minutes',
        ...options.metadata
      },
      modelType: 'regression'
    });

    // Create internal regression model
    this.internalModel = new SimpleRegressionModel({
      name: 'wait_time_regression',
      features: this.features,
      targets: this.targets
    });
  }

  /**
   * Train the model on wait time data
   * @param {Array} waitTimeData - Array of wait time data points
   * @returns {Promise} - Promise that resolves when the model is trained
   */
  async train(waitTimeData) {
    // Extract features and target
    const X = [];
    const y = [];

    for (const data of waitTimeData) {
      // Create feature vector
      const features = [
        data.patientCount || 0,
        data.staffingLevel || 0,
        data.acuityLevel || 3,
        data.hourOfDay !== undefined ? data.hourOfDay / 24 : 0.5, // Normalize hour to 0-1
        data.dayOfWeek !== undefined ? data.dayOfWeek / 7 : 0.5, // Normalize day to 0-1
        data.bedUtilization || 0.5
      ];

      X.push(features);
      y.push(data.waitTime || 0);
    }

    // Split data into training and testing sets
    const { X_train, y_train, X_test, y_test } = trainTestSplit(X, y, { testSize: 0.2 });

    // Normalize features
    for (let i = 0; i < this.features.length; i++) {
      const featureValues = X_train.map(x => x[i]);
      const { params } = normalize(featureValues);
      this.featureScalers.set(this.features[i], params);

      // Apply normalization to training data
      for (let j = 0; j < X_train.length; j++) {
        X_train[j][i] = (X_train[j][i] - params.mean) / params.stdDev;
      }

      // Apply normalization to testing data
      for (let j = 0; j < X_test.length; j++) {
        X_test[j][i] = (X_test[j][i] - params.mean) / params.stdDev;
      }
    }

    // Normalize target
    const { params } = normalize(y_train);
    this.targetScalers.set(this.targets[0], params);

    // Apply normalization to training target
    const normalizedY_train = y_train.map(y => (y - params.mean) / params.stdDev);

    // Apply normalization to testing target
    const normalizedY_test = y_test.map(y => (y - params.mean) / params.stdDev);

    // Train the internal model
    await this.internalModel.train(X_train, normalizedY_train);

    // Evaluate the model
    const predictions = [];
    for (const x of X_test) {
      predictions.push(await this.internalModel.predict(x));
    }

    // Calculate mean squared error
    let mse = 0;
    for (let i = 0; i < predictions.length; i++) {
      mse += Math.pow(predictions[i] - normalizedY_test[i], 2);
    }
    mse /= predictions.length;

    // Update metadata
    this.metadata.updatedAt = new Date();
    this.metadata.performance = {
      mse,
      rmse: Math.sqrt(mse)
    };

    this.isLoaded = true;

    return {
      mse,
      rmse: Math.sqrt(mse)
    };
  }

  /**
   * Make a prediction using the model
   * @param {Object} context - Context object with current state
   * @returns {Promise} - Promise that resolves with the predicted wait time
   */
  async predict(context) {
    if (!this.isLoaded) {
      await this.load();
    }

    // Create feature vector
    const features = [
      context.patientCount || 0,
      context.staffingLevel || 0,
      context.acuityLevel || 3,
      context.hourOfDay !== undefined ? context.hourOfDay / 24 : 0.5, // Normalize hour to 0-1
      context.dayOfWeek !== undefined ? context.dayOfWeek / 7 : 0.5, // Normalize day to 0-1
      context.bedUtilization || 0.5
    ];

    // Preprocess features
    const preprocessedFeatures = this.preprocess(features);

    // Make prediction
    const prediction = await this.internalModel.predict(preprocessedFeatures);

    // Postprocess prediction
    const postprocessedPrediction = this.postprocess(prediction);

    // Ensure prediction is positive
    return Math.max(0, postprocessedPrediction);
  }
}

/**
 * Patient Flow prediction model
 */
class PatientFlowModel extends HealthcarePredictionModel {
  /**
   * Constructor for the PatientFlowModel class
   * @param {Object} options - Model options
   */
  constructor(options = {}) {
    super({
      name: options.name || 'patient_flow_model',
      type: 'time_series',
      features: options.features || [
        'hourOfDay',
        'dayOfWeek',
        'isHoliday',
        'weatherCondition',
        'previousFlow'
      ],
      targets: ['arrivalRate'],
      metadata: {
        description: 'Predicts patient arrival rate per hour',
        ...options.metadata
      },
      modelType: 'time_series'
    });

    this.historyLength = options.historyLength || 168; // 1 week of hourly data
    this.forecastHorizon = options.forecastHorizon || 24; // 24 hours ahead

    // Create internal time series model
    this.internalModel = new TimeSeriesModel({
      name: 'patient_flow_ts',
      historyLength: this.historyLength,
      forecastHorizon: this.forecastHorizon,
      features: this.features,
      targets: this.targets
    });
  }

  /**
   * Train the model on patient flow data
   * @param {Array} flowData - Array of patient flow data points
   * @returns {Promise} - Promise that resolves when the model is trained
   */
  async train(flowData) {
    // Ensure data is in the correct format
    const formattedData = flowData.map(data => {
      if (typeof data === 'number') {
        // If data is just a number, assume it's the arrival rate
        return {
          arrivalRate: data,
          hourOfDay: 0,
          dayOfWeek: 0,
          isHoliday: 0,
          weatherCondition: 0,
          previousFlow: 0
        };
      }
      return data;
    });

    // Train the internal model
    await this.internalModel.train(formattedData);

    this.isLoaded = true;

    return {
      weights: this.internalModel.weights,
      seasonality: this.internalModel.seasonality
    };
  }

  /**
   * Make a forecast using the model
   * @param {Array} history - Historical patient flow data
   * @returns {Promise} - Promise that resolves with the forecast
   */
  async forecast(history) {
    if (!this.isLoaded) {
      await this.load();
    }

    // Ensure history is in the correct format
    const formattedHistory = history.map(data => {
      if (typeof data === 'number') {
        // If data is just a number, assume it's the arrival rate
        return {
          arrivalRate: data,
          hourOfDay: 0,
          dayOfWeek: 0,
          isHoliday: 0,
          weatherCondition: 0,
          previousFlow: 0
        };
      }
      return data;
    });

    // Make forecast
    const forecast = await this.internalModel.forecast(formattedHistory);

    // Ensure forecast values are positive
    return forecast.map(value => Math.max(0, value));
  }
}

// Export the classes
export {
  HealthcarePredictionModel,
  LengthOfStayModel,
  ReadmissionRiskModel,
  ResourceUtilizationModel,
  WaitTimeModel,
  PatientFlowModel
};
