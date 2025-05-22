/**
 * Machine Learning Integration Module
 * Provides interfaces for integrating machine learning models with the simulation
 */

/**
 * Base class for ML model integration
 */
class MLModel {
  /**
   * Constructor for the MLModel class
   * @param {Object} options - Model options
   * @param {string} options.name - Model name
   * @param {string} options.type - Model type (regression, classification, etc.)
   * @param {Array} options.features - Feature names
   * @param {Array} options.targets - Target names
   */
  constructor(options = {}) {
    this.name = options.name || 'unnamed_model';
    this.type = options.type || 'unknown';
    this.features = options.features || [];
    this.targets = options.targets || [];
    this.isLoaded = false;
    this.metadata = {
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
      ...options.metadata
    };
  }

  /**
   * Load the model
   * @returns {Promise} - Promise that resolves when the model is loaded
   */
  async load() {
    // To be implemented by subclasses
    this.isLoaded = true;
    return Promise.resolve();
  }

  /**
   * Make a prediction using the model
   * @param {Object|Array} input - Input data for prediction
   * @returns {Promise} - Promise that resolves with the prediction
   */
  async predict(input) {
    // To be implemented by subclasses
    if (!this.isLoaded) {
      await this.load();
    }
    return Promise.resolve(null);
  }

  /**
   * Get model information
   * @returns {Object} - Model information
   */
  getInfo() {
    return {
      name: this.name,
      type: this.type,
      features: this.features,
      targets: this.targets,
      isLoaded: this.isLoaded,
      metadata: this.metadata
    };
  }
}

/**
 * Simple regression model using linear regression
 */
class SimpleRegressionModel extends MLModel {
  /**
   * Constructor for the SimpleRegressionModel class
   * @param {Object} options - Model options
   * @param {Array} options.coefficients - Model coefficients
   * @param {number} options.intercept - Model intercept
   */
  constructor(options = {}) {
    super({
      name: options.name || 'simple_regression',
      type: 'regression',
      features: options.features || [],
      targets: options.targets || ['prediction'],
      metadata: options.metadata
    });
    
    this.coefficients = options.coefficients || [];
    this.intercept = options.intercept || 0;
  }

  /**
   * Load the model
   * @returns {Promise} - Promise that resolves when the model is loaded
   */
  async load() {
    // Simple model is already loaded
    this.isLoaded = true;
    return Promise.resolve();
  }

  /**
   * Make a prediction using the model
   * @param {Array|Object} input - Input data for prediction
   * @returns {Promise} - Promise that resolves with the prediction
   */
  async predict(input) {
    if (!this.isLoaded) {
      await this.load();
    }
    
    // Convert input to array if it's an object
    const features = Array.isArray(input) ? input : this.features.map(f => input[f]);
    
    // Check if input has the correct number of features
    if (features.length !== this.coefficients.length) {
      throw new Error(`Input has ${features.length} features, but model expects ${this.coefficients.length}`);
    }
    
    // Calculate prediction
    let prediction = this.intercept;
    for (let i = 0; i < features.length; i++) {
      prediction += features[i] * this.coefficients[i];
    }
    
    return Promise.resolve(prediction);
  }

  /**
   * Train the model on data
   * @param {Array} X - Feature data
   * @param {Array} y - Target data
   * @returns {Promise} - Promise that resolves when the model is trained
   */
  async train(X, y) {
    // Simple linear regression training
    // X is a 2D array of features, y is a 1D array of targets
    
    // Check if X and y have the same number of samples
    if (X.length !== y.length) {
      throw new Error(`X has ${X.length} samples, but y has ${y.length}`);
    }
    
    // Check if X has at least one feature
    if (X[0].length === 0) {
      throw new Error('X must have at least one feature');
    }
    
    // Set number of features
    const numFeatures = X[0].length;
    
    // Initialize coefficients
    this.coefficients = new Array(numFeatures).fill(0);
    
    // Simple gradient descent
    const learningRate = 0.01;
    const numIterations = 1000;
    
    for (let iter = 0; iter < numIterations; iter++) {
      // Calculate predictions
      const predictions = X.map(x => {
        let pred = this.intercept;
        for (let i = 0; i < numFeatures; i++) {
          pred += x[i] * this.coefficients[i];
        }
        return pred;
      });
      
      // Calculate errors
      const errors = predictions.map((pred, i) => pred - y[i]);
      
      // Calculate gradients
      const interceptGradient = errors.reduce((sum, error) => sum + error, 0) / X.length;
      const coefficientGradients = new Array(numFeatures).fill(0);
      
      for (let i = 0; i < numFeatures; i++) {
        coefficientGradients[i] = errors.reduce((sum, error, j) => sum + error * X[j][i], 0) / X.length;
      }
      
      // Update parameters
      this.intercept -= learningRate * interceptGradient;
      for (let i = 0; i < numFeatures; i++) {
        this.coefficients[i] -= learningRate * coefficientGradients[i];
      }
    }
    
    // Update metadata
    this.metadata.updatedAt = new Date();
    this.isLoaded = true;
    
    return Promise.resolve({
      coefficients: this.coefficients,
      intercept: this.intercept
    });
  }
}

/**
 * Time series forecasting model
 */
class TimeSeriesModel extends MLModel {
  /**
   * Constructor for the TimeSeriesModel class
   * @param {Object} options - Model options
   * @param {number} options.historyLength - Number of historical points to use
   * @param {number} options.forecastHorizon - Number of points to forecast
   */
  constructor(options = {}) {
    super({
      name: options.name || 'time_series_model',
      type: 'time_series',
      features: options.features || ['time'],
      targets: options.targets || ['value'],
      metadata: options.metadata
    });
    
    this.historyLength = options.historyLength || 10;
    this.forecastHorizon = options.forecastHorizon || 5;
    this.weights = options.weights || [];
    this.seasonality = options.seasonality || null;
  }

  /**
   * Load the model
   * @returns {Promise} - Promise that resolves when the model is loaded
   */
  async load() {
    // Initialize weights if not provided
    if (this.weights.length === 0) {
      this.weights = new Array(this.historyLength).fill(1 / this.historyLength);
    }
    
    this.isLoaded = true;
    return Promise.resolve();
  }

  /**
   * Make a forecast using the model
   * @param {Array} history - Historical data
   * @returns {Promise} - Promise that resolves with the forecast
   */
  async forecast(history) {
    if (!this.isLoaded) {
      await this.load();
    }
    
    // Check if history has enough data
    if (history.length < this.historyLength) {
      throw new Error(`History has ${history.length} points, but model expects at least ${this.historyLength}`);
    }
    
    // Get the most recent data
    const recentData = history.slice(-this.historyLength);
    
    // Make forecast
    const forecast = [];
    let currentHistory = [...recentData];
    
    for (let i = 0; i < this.forecastHorizon; i++) {
      // Calculate weighted average
      let prediction = 0;
      for (let j = 0; j < this.historyLength; j++) {
        prediction += currentHistory[j] * this.weights[j];
      }
      
      // Add seasonality if provided
      if (this.seasonality) {
        const season = (history.length + i) % this.seasonality.period;
        prediction += this.seasonality.factors[season] || 0;
      }
      
      // Add prediction to forecast
      forecast.push(prediction);
      
      // Update history for next prediction
      currentHistory.shift();
      currentHistory.push(prediction);
    }
    
    return Promise.resolve(forecast);
  }

  /**
   * Train the model on historical data
   * @param {Array} history - Historical data
   * @returns {Promise} - Promise that resolves when the model is trained
   */
  async train(history) {
    // Simple exponential smoothing
    const alpha = 0.3; // Smoothing factor
    
    // Initialize weights
    this.weights = new Array(this.historyLength).fill(0);
    
    // Calculate exponentially decreasing weights
    let sum = 0;
    for (let i = 0; i < this.historyLength; i++) {
      this.weights[i] = Math.pow(1 - alpha, i);
      sum += this.weights[i];
    }
    
    // Normalize weights
    for (let i = 0; i < this.historyLength; i++) {
      this.weights[i] /= sum;
    }
    
    // Detect seasonality if enough data
    if (history.length >= 24) {
      this.detectSeasonality(history);
    }
    
    // Update metadata
    this.metadata.updatedAt = new Date();
    this.isLoaded = true;
    
    return Promise.resolve({
      weights: this.weights,
      seasonality: this.seasonality
    });
  }

  /**
   * Detect seasonality in the data
   * @param {Array} history - Historical data
   * @private
   */
  detectSeasonality(history) {
    // Simple seasonality detection
    // Try different periods and find the one with the lowest error
    const possiblePeriods = [24, 12, 7, 4]; // Hours in day, months in year, days in week, quarters in year
    
    let bestPeriod = null;
    let bestError = Infinity;
    
    for (const period of possiblePeriods) {
      if (history.length < period * 2) {
        continue; // Not enough data for this period
      }
      
      // Calculate seasonal factors
      const factors = new Array(period).fill(0);
      const counts = new Array(period).fill(0);
      
      for (let i = 0; i < history.length; i++) {
        const season = i % period;
        factors[season] += history[i];
        counts[season]++;
      }
      
      // Calculate average for each season
      for (let i = 0; i < period; i++) {
        factors[i] /= counts[i];
      }
      
      // Calculate overall average
      const average = history.reduce((sum, val) => sum + val, 0) / history.length;
      
      // Normalize factors
      for (let i = 0; i < period; i++) {
        factors[i] = factors[i] / average - 1;
      }
      
      // Calculate error
      let error = 0;
      for (let i = 0; i < history.length; i++) {
        const season = i % period;
        const prediction = average * (1 + factors[season]);
        error += Math.pow(history[i] - prediction, 2);
      }
      
      // Update best period if this one is better
      if (error < bestError) {
        bestError = error;
        bestPeriod = period;
        this.seasonality = {
          period,
          factors
        };
      }
    }
  }
}

// Export the classes
export { MLModel, SimpleRegressionModel, TimeSeriesModel };
