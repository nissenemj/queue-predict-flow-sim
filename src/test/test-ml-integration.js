import { MLModel, SimpleRegressionModel, TimeSeriesModel } from '../ml/MLIntegration.js';
import { 
  normalize, 
  denormalize, 
  minMaxScale, 
  trainTestSplit, 
  createTimeSeriesFeatures,
  movingAverage 
} from '../ml/DataPreprocessing.js';
import PredictionService from '../ml/PredictionService.js';
import SimulationEngine from '../simulators/SimulationEngine.js';
import ERFlowSimulator from '../simulators/ERFlowSimulator.js';

/**
 * Test the ML integration
 */
const testMLIntegration = async () => {
  console.log('=== Testing ML Integration ===');
  
  // Test ML models
  await testMLModels();
  
  // Test data preprocessing
  testDataPreprocessing();
  
  // Test prediction service
  await testPredictionService();
  
  // Test integration with simulation engine
  await testSimulationIntegration();
  
  console.log('=== ML Integration Testing Complete ===');
};

/**
 * Test ML models
 */
const testMLModels = async () => {
  console.log('\n--- Testing ML Models ---');
  
  // Test simple regression model
  console.log('Testing SimpleRegressionModel...');
  const regressionModel = new SimpleRegressionModel({
    name: 'test_regression',
    features: ['x1', 'x2'],
    targets: ['y']
  });
  
  // Train the model
  const X = [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6]
  ];
  
  const y = [5, 8, 11, 14, 17]; // y = 2*x1 + 3*x2
  
  const trainResult = await regressionModel.train(X, y);
  console.log('Training result:', trainResult);
  
  // Make predictions
  const prediction = await regressionModel.predict([6, 7]);
  console.log('Prediction for [6, 7]:', prediction);
  console.log('Expected:', 2*6 + 3*7);
  
  // Test time series model
  console.log('\nTesting TimeSeriesModel...');
  const timeSeriesModel = new TimeSeriesModel({
    name: 'test_time_series',
    historyLength: 5,
    forecastHorizon: 3
  });
  
  // Generate sample data
  const history = [10, 12, 15, 14, 16, 18, 20, 22, 21, 23];
  
  // Train the model
  const tsTrainResult = await timeSeriesModel.train(history);
  console.log('Training result:', tsTrainResult);
  
  // Make forecast
  const forecast = await timeSeriesModel.forecast(history);
  console.log('Forecast:', forecast);
  
  console.log('--- ML Models Testing Complete ---');
};

/**
 * Test data preprocessing
 */
const testDataPreprocessing = () => {
  console.log('\n--- Testing Data Preprocessing ---');
  
  // Test normalization
  console.log('Testing normalization...');
  const data = [10, 20, 30, 40, 50];
  const normalizedResult = normalize(data);
  console.log('Normalized data:', normalizedResult.data);
  console.log('Normalization params:', normalizedResult.params);
  
  // Test denormalization
  const denormalizedData = denormalize(normalizedResult.data, normalizedResult.params);
  console.log('Denormalized data:', denormalizedData);
  
  // Test min-max scaling
  console.log('\nTesting min-max scaling...');
  const scaledResult = minMaxScale(data, { min: 0, max: 1 });
  console.log('Scaled data:', scaledResult.data);
  console.log('Scaling params:', scaledResult.params);
  
  // Test train-test split
  console.log('\nTesting train-test split...');
  const X_data = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]];
  const y_data = [10, 20, 30, 40, 50];
  const splitResult = trainTestSplit(X_data, y_data, { testSize: 0.4 });
  console.log('Train size:', splitResult.X_train.length);
  console.log('Test size:', splitResult.X_test.length);
  
  // Test time series feature creation
  console.log('\nTesting time series feature creation...');
  const sequence = [10, 12, 15, 14, 16, 18, 20, 22, 21, 23];
  const tsFeatures = createTimeSeriesFeatures(sequence, { lagSteps: 3 });
  console.log('Features shape:', `${tsFeatures.X.length} x ${tsFeatures.X[0].length}`);
  console.log('Targets length:', tsFeatures.y.length);
  
  // Test moving average
  console.log('\nTesting moving average...');
  const ma = movingAverage(sequence, { window: 3 });
  console.log('Moving average:', ma);
  
  console.log('--- Data Preprocessing Testing Complete ---');
};

/**
 * Test prediction service
 */
const testPredictionService = async () => {
  console.log('\n--- Testing Prediction Service ---');
  
  // Create prediction service
  const predictionService = new PredictionService();
  
  // Create and register models
  console.log('Creating and registering models...');
  
  // Create regression model
  const regressionModel = new SimpleRegressionModel({
    name: 'test_regression',
    features: ['x1', 'x2'],
    targets: ['y']
  });
  
  // Train the model
  const X = [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6]
  ];
  
  const y = [5, 8, 11, 14, 17]; // y = 2*x1 + 3*x2
  
  await regressionModel.train(X, y);
  
  // Register the model
  predictionService.registerModel('regression', regressionModel, true);
  
  // Create time series model
  const timeSeriesModel = new TimeSeriesModel({
    name: 'test_time_series',
    historyLength: 5,
    forecastHorizon: 3
  });
  
  // Generate sample data
  const history = [10, 12, 15, 14, 16, 18, 20, 22, 21, 23];
  
  // Train the model
  await timeSeriesModel.train(history);
  
  // Register the model
  predictionService.registerModel('time_series', timeSeriesModel);
  
  // Test predictions
  console.log('\nTesting predictions...');
  const prediction = await predictionService.predict([6, 7]);
  console.log('Prediction for [6, 7]:', prediction);
  
  // Test forecasts
  console.log('\nTesting forecasts...');
  const forecast = await predictionService.forecast(history, { modelId: 'time_series' });
  console.log('Forecast:', forecast);
  
  console.log('--- Prediction Service Testing Complete ---');
};

/**
 * Test integration with simulation engine
 */
const testSimulationIntegration = async () => {
  console.log('\n--- Testing Simulation Integration ---');
  
  // Create simulation engine with ML enabled
  const simulator = new SimulationEngine({
    debug: true,
    enablePredictions: true
  });
  
  // Create and register models
  console.log('Creating and registering models...');
  
  // Create regression model for length of stay
  const losModel = new SimpleRegressionModel({
    name: 'length_of_stay',
    features: ['age', 'acuity_level', 'comorbidities'],
    targets: ['length_of_stay']
  });
  
  // Train the model with sample data
  const patientFeatures = [
    [25, 3, 0],
    [45, 2, 1],
    [65, 1, 2],
    [35, 3, 1],
    [55, 2, 2]
  ];
  
  const losValues = [2, 3, 5, 2.5, 4];
  
  await losModel.train(patientFeatures, losValues);
  
  // Register the model
  simulator.registerModel('length_of_stay', losModel, true);
  
  // Create time series model for arrivals
  const arrivalsModel = new TimeSeriesModel({
    name: 'arrivals',
    historyLength: 24,
    forecastHorizon: 24
  });
  
  // Generate sample arrival data
  const hourlyArrivals = Array.from({ length: 72 }, (_, i) => {
    const hour = i % 24;
    // More arrivals during day, fewer at night
    return 5 + 3 * Math.sin(hour / 24 * 2 * Math.PI) + Math.random() * 2;
  });
  
  // Train the model
  await arrivalsModel.train(hourlyArrivals);
  
  // Register the model
  simulator.registerModel('arrivals', arrivalsModel);
  
  // Test predictions
  console.log('\nTesting predictions in simulation...');
  
  // Predict length of stay for a patient
  const losPrediction = await simulator.predict([40, 2, 1], 'length_of_stay');
  console.log('Length of stay prediction for patient:', losPrediction);
  
  // Predict arrivals
  const arrivalsForecast = await simulator.forecast(hourlyArrivals, { modelId: 'arrivals' });
  console.log('Arrivals forecast (next 3 hours):', arrivalsForecast.slice(0, 3));
  
  // Test with ER Flow Simulator
  console.log('\nTesting with ER Flow Simulator...');
  
  // Create ER Flow Simulator with ML enabled
  const erSimulator = new ERFlowSimulator({
    debug: true,
    enablePredictions: true
  });
  
  // Register the models
  erSimulator.registerModel('length_of_stay', losModel);
  erSimulator.registerModel('arrivals', arrivalsModel);
  
  // Initialize with configuration
  erSimulator.initialize({
    arrival_rates: {
      morning: 5,
      afternoon: 4,
      evening: 3,
      night: 2
    },
    staff: {
      doctors: {
        day: 3,
        evening: 2,
        night: 1
      },
      nurses: {
        day: 6,
        evening: 4,
        night: 2
      }
    },
    ed_beds_capacity: 20,
    ward_beds_capacity: 100,
    duration_days: 1
  });
  
  // Create a prediction model from simulation data
  await erSimulator.createPredictionModel('waiting_time', {
    waitingTimeData: [
      { patientCount: 10, doctorCount: 3, nurseCount: 6, bedCount: 20, waitingTime: 15 },
      { patientCount: 15, doctorCount: 3, nurseCount: 6, bedCount: 20, waitingTime: 25 },
      { patientCount: 20, doctorCount: 3, nurseCount: 6, bedCount: 20, waitingTime: 40 },
      { patientCount: 10, doctorCount: 2, nurseCount: 4, bedCount: 20, waitingTime: 30 },
      { patientCount: 15, doctorCount: 2, nurseCount: 4, bedCount: 20, waitingTime: 45 }
    ]
  });
  
  // Predict waiting time
  const waitingTimePrediction = await erSimulator.predict(
    [12, 3, 6, 20],
    'waiting_time'
  );
  
  console.log('Waiting time prediction:', waitingTimePrediction);
  
  console.log('--- Simulation Integration Testing Complete ---');
};

// Run the tests
testMLIntegration().catch(error => {
  console.error('Error running ML integration tests:', error);
});

export default testMLIntegration;
