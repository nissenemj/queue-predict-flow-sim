/**
 * Data Preprocessing Utilities
 * Provides functions for preprocessing data for machine learning models
 */

/**
 * Normalize data to have zero mean and unit variance
 * @param {Array} data - Data to normalize
 * @param {Object} options - Normalization options
 * @param {boolean} options.returnParams - Whether to return normalization parameters
 * @returns {Object} - Normalized data and parameters
 */
function normalize(data, options = {}) {
  const returnParams = options.returnParams !== undefined ? options.returnParams : true;
  
  // Calculate mean and standard deviation
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalize data
  const normalizedData = data.map(val => (val - mean) / stdDev);
  
  if (returnParams) {
    return {
      data: normalizedData,
      params: { mean, stdDev }
    };
  }
  
  return normalizedData;
}

/**
 * Denormalize data using normalization parameters
 * @param {Array} normalizedData - Normalized data
 * @param {Object} params - Normalization parameters
 * @param {number} params.mean - Mean of the original data
 * @param {number} params.stdDev - Standard deviation of the original data
 * @returns {Array} - Denormalized data
 */
function denormalize(normalizedData, params) {
  return normalizedData.map(val => val * params.stdDev + params.mean);
}

/**
 * Min-max scale data to a specific range
 * @param {Array} data - Data to scale
 * @param {Object} options - Scaling options
 * @param {number} options.min - Minimum value of the scaled data
 * @param {number} options.max - Maximum value of the scaled data
 * @param {boolean} options.returnParams - Whether to return scaling parameters
 * @returns {Object} - Scaled data and parameters
 */
function minMaxScale(data, options = {}) {
  const min = options.min !== undefined ? options.min : 0;
  const max = options.max !== undefined ? options.max : 1;
  const returnParams = options.returnParams !== undefined ? options.returnParams : true;
  
  // Find min and max of the data
  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  const dataRange = dataMax - dataMin;
  
  // Scale data
  const scaledData = data.map(val => {
    if (dataRange === 0) return min; // Handle constant data
    return min + (val - dataMin) * (max - min) / dataRange;
  });
  
  if (returnParams) {
    return {
      data: scaledData,
      params: { dataMin, dataMax, targetMin: min, targetMax: max }
    };
  }
  
  return scaledData;
}

/**
 * Unscale data using min-max scaling parameters
 * @param {Array} scaledData - Scaled data
 * @param {Object} params - Scaling parameters
 * @param {number} params.dataMin - Minimum value of the original data
 * @param {number} params.dataMax - Maximum value of the original data
 * @param {number} params.targetMin - Minimum value of the scaled data
 * @param {number} params.targetMax - Maximum value of the scaled data
 * @returns {Array} - Unscaled data
 */
function minMaxUnscale(scaledData, params) {
  const { dataMin, dataMax, targetMin, targetMax } = params;
  const dataRange = dataMax - dataMin;
  const targetRange = targetMax - targetMin;
  
  return scaledData.map(val => {
    if (targetRange === 0) return dataMin; // Handle constant data
    return dataMin + (val - targetMin) * dataRange / targetRange;
  });
}

/**
 * Split data into training and testing sets
 * @param {Array} X - Feature data
 * @param {Array} y - Target data
 * @param {Object} options - Split options
 * @param {number} options.testSize - Fraction of data to use for testing
 * @param {boolean} options.shuffle - Whether to shuffle the data before splitting
 * @returns {Object} - Training and testing sets
 */
function trainTestSplit(X, y, options = {}) {
  const testSize = options.testSize !== undefined ? options.testSize : 0.2;
  const shuffle = options.shuffle !== undefined ? options.shuffle : true;
  
  // Check if X and y have the same number of samples
  if (X.length !== y.length) {
    throw new Error(`X has ${X.length} samples, but y has ${y.length}`);
  }
  
  // Create indices
  let indices = Array.from({ length: X.length }, (_, i) => i);
  
  // Shuffle indices if requested
  if (shuffle) {
    indices = shuffleArray(indices);
  }
  
  // Calculate split point
  const splitPoint = Math.floor(X.length * (1 - testSize));
  
  // Split indices
  const trainIndices = indices.slice(0, splitPoint);
  const testIndices = indices.slice(splitPoint);
  
  // Create training and testing sets
  const X_train = trainIndices.map(i => X[i]);
  const y_train = trainIndices.map(i => y[i]);
  const X_test = testIndices.map(i => X[i]);
  const y_test = testIndices.map(i => y[i]);
  
  return {
    X_train,
    y_train,
    X_test,
    y_test
  };
}

/**
 * Shuffle an array
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 * @private
 */
function shuffleArray(array) {
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * Create time series features from a sequence
 * @param {Array} sequence - Time series sequence
 * @param {Object} options - Feature creation options
 * @param {number} options.lagSteps - Number of lag steps to use as features
 * @param {boolean} options.addTimeFeatures - Whether to add time-based features
 * @returns {Object} - Features and targets
 */
function createTimeSeriesFeatures(sequence, options = {}) {
  const lagSteps = options.lagSteps !== undefined ? options.lagSteps : 3;
  const addTimeFeatures = options.addTimeFeatures !== undefined ? options.addTimeFeatures : false;
  
  // Check if sequence has enough data
  if (sequence.length <= lagSteps) {
    throw new Error(`Sequence has ${sequence.length} points, but at least ${lagSteps + 1} are required`);
  }
  
  const X = [];
  const y = [];
  
  // Create features and targets
  for (let i = lagSteps; i < sequence.length; i++) {
    // Create lag features
    const features = [];
    for (let j = 1; j <= lagSteps; j++) {
      features.push(sequence[i - j]);
    }
    
    // Add time features if requested
    if (addTimeFeatures) {
      // Add hour of day (assuming sequence is hourly data)
      const hourOfDay = (i % 24) / 24;
      features.push(hourOfDay);
      
      // Add day of week (assuming sequence is hourly data)
      const dayOfWeek = (Math.floor(i / 24) % 7) / 7;
      features.push(dayOfWeek);
    }
    
    // Add features and target
    X.push(features);
    y.push(sequence[i]);
  }
  
  return { X, y };
}

/**
 * Calculate moving average of a sequence
 * @param {Array} sequence - Time series sequence
 * @param {Object} options - Moving average options
 * @param {number} options.window - Window size
 * @returns {Array} - Moving average
 */
function movingAverage(sequence, options = {}) {
  const window = options.window !== undefined ? options.window : 3;
  
  // Check if sequence has enough data
  if (sequence.length < window) {
    throw new Error(`Sequence has ${sequence.length} points, but window size is ${window}`);
  }
  
  const result = [];
  
  // Calculate moving average
  for (let i = 0; i < sequence.length - window + 1; i++) {
    const sum = sequence.slice(i, i + window).reduce((acc, val) => acc + val, 0);
    result.push(sum / window);
  }
  
  return result;
}

/**
 * Calculate exponential moving average of a sequence
 * @param {Array} sequence - Time series sequence
 * @param {Object} options - Exponential moving average options
 * @param {number} options.alpha - Smoothing factor
 * @returns {Array} - Exponential moving average
 */
function exponentialMovingAverage(sequence, options = {}) {
  const alpha = options.alpha !== undefined ? options.alpha : 0.3;
  
  // Check if sequence has data
  if (sequence.length === 0) {
    return [];
  }
  
  const result = [sequence[0]];
  
  // Calculate exponential moving average
  for (let i = 1; i < sequence.length; i++) {
    result.push(alpha * sequence[i] + (1 - alpha) * result[i - 1]);
  }
  
  return result;
}

// Export the functions
export {
  normalize,
  denormalize,
  minMaxScale,
  minMaxUnscale,
  trainTestSplit,
  createTimeSeriesFeatures,
  movingAverage,
  exponentialMovingAverage
};
