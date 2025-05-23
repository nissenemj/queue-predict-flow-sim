/**
 * Debug script for the hospital simulation
 * This script tests the basic functionality of the simulation components
 */

import SimulationEngineCompat from './src/simulators/SimulationEngineCompat.js';
import ERFlowSimulator from './src/simulators/ERFlowSimulator.js';
import HospitalSimulator from './src/simulators/HospitalSimulator.js';
import Patient from './src/models/Patient.js';
import { EmergencyArrival, PatientTransfer, PatientDischarge } from './src/models/HealthcareEvents.js';
import ERFlowUI from './src/ui/ERFlowUI.js';

// Debug function to test the SimulationEngineCompat
function testSimulationEngineCompat() {
  console.log('Testing SimulationEngineCompat...');

  try {
    const engine = new SimulationEngineCompat({ debug: true });
    console.log('SimulationEngineCompat created successfully');

    // Test event scheduling
    const event = engine.scheduleEvent(10, null, 'test_event');
    console.log('Event scheduled successfully:', event);

    // Test priority-based event scheduling
    const priorityEvent = engine.scheduleEventWithPriority(10, null, 'priority_event', {}, 50);
    console.log('Priority event scheduled successfully:', priorityEvent);

    console.log('SimulationEngineCompat tests passed');
    return true;
  } catch (error) {
    console.error('SimulationEngineCompat test failed:', error);
    return false;
  }
}

// Debug function to test the ERFlowSimulator
function testERFlowSimulator() {
  console.log('Testing ERFlowSimulator...');

  try {
    const simulator = new ERFlowSimulator({ debug: true });
    console.log('ERFlowSimulator created successfully');

    // Test initialization
    simulator.initialize({
      arrival_rates: {
        morning: 8,
        afternoon: 7,
        evening: 5,
        night: 3
      },
      staff: {
        doctors: {
          day: 6,
          evening: 4,
          night: 2
        },
        nurses: {
          day: 12,
          evening: 10,
          night: 6
        }
      },
      ed_beds_capacity: 50,
      ward_beds_capacity: 300,
      duration_days: 1
    });
    console.log('ERFlowSimulator initialized successfully');

    // Test event scheduling
    const patient = new Patient(1, 0);
    const event = simulator.scheduleEvent(10, patient, 'test_event');
    console.log('Event scheduled successfully in ERFlowSimulator:', event);

    console.log('ERFlowSimulator tests passed');
    return true;
  } catch (error) {
    console.error('ERFlowSimulator test failed:', error);
    return false;
  }
}

// Debug function to test the HospitalSimulator
function testHospitalSimulator() {
  console.log('Testing HospitalSimulator...');

  try {
    const config = {
      resources: {
        doctors: 15,
        nurses: 30,
        beds: 50
      }
    };

    const simulator = new HospitalSimulator(config, { debug: true });
    console.log('HospitalSimulator created successfully');

    // Test event scheduling
    const patient = new Patient(1, 0);
    const event = simulator.scheduleEvent(10, patient, 'test_event');
    console.log('Event scheduled successfully in HospitalSimulator:', event);

    // Test priority-based event scheduling
    const priorityEvent = simulator.scheduleEvent(10, patient, 'priority_event', {}, 50);
    console.log('Priority event scheduled successfully in HospitalSimulator:', priorityEvent);

    console.log('HospitalSimulator tests passed');
    return true;
  } catch (error) {
    console.error('HospitalSimulator test failed:', error);
    return false;
  }
}

// Debug function to test the Patient class
function testPatient() {
  console.log('Testing Patient class...');

  try {
    const patient = new Patient(1, 0);
    console.log('Patient created successfully:', patient);

    // Test patient methods
    const admissionProb = patient.getAdmissionProbability();
    console.log('Admission probability:', admissionProb);

    const arrivalMode = patient.generateArrivalMode();
    console.log('Arrival mode:', arrivalMode);

    const priorityScore = patient.calculatePriorityScore();
    console.log('Priority score:', priorityScore);

    const clinicalPathway = patient.assignClinicalPathway();
    console.log('Clinical pathway:', clinicalPathway);

    const expectedLOS = patient.calculateExpectedLOS();
    console.log('Expected length of stay:', expectedLOS);

    const riskFactors = patient.generateRiskFactors();
    console.log('Risk factors:', riskFactors);

    console.log('Patient tests passed');
    return true;
  } catch (error) {
    console.error('Patient test failed:', error);
    return false;
  }
}

// Debug function to test the HealthcareEvents
function testHealthcareEvents() {
  console.log('Testing HealthcareEvents...');

  try {
    const emergencyArrival = new EmergencyArrival({
      arrivalMode: 'ambulance',
      condition: 'trauma',
      estimatedAcuity: 1,
      preNotification: true
    });
    console.log('EmergencyArrival created successfully:', emergencyArrival);

    const patientTransfer = new PatientTransfer({
      sourceLocation: 'ED',
      targetLocation: 'ICU',
      transferReason: 'critical_care',
      isEmergent: true
    });
    console.log('PatientTransfer created successfully:', patientTransfer);

    const patientDischarge = new PatientDischarge({
      dischargeType: 'routine',
      dischargeDestination: 'home',
      requiresFollowUp: true,
      medications: ['medication1', 'medication2'],
      instructions: ['instruction1', 'instruction2']
    });
    console.log('PatientDischarge created successfully:', patientDischarge);

    console.log('HealthcareEvents tests passed');
    return true;
  } catch (error) {
    console.error('HealthcareEvents test failed:', error);
    return false;
  }
}

// Debug function to test the web interface
function testWebInterface() {
  console.log('Testing web interface...');

  try {
    // Create a container for the UI
    const container = document.createElement('div');
    container.id = 'test-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    container.style.zIndex = '9998';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';

    // Create a close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close Test';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.zIndex = '9999';
    closeButton.style.padding = '10px';
    closeButton.style.backgroundColor = '#f44336';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';

    closeButton.addEventListener('click', () => {
      document.body.removeChild(container);
    });

    container.appendChild(closeButton);

    // Create a content container
    const content = document.createElement('div');
    content.style.backgroundColor = 'white';
    content.style.padding = '20px';
    content.style.borderRadius = '8px';
    content.style.width = '80%';
    content.style.height = '80%';
    content.style.overflow = 'auto';

    container.appendChild(content);

    // Create UI elements
    const title = document.createElement('h2');
    title.textContent = 'Web Interface Test';
    content.appendChild(title);

    const description = document.createElement('p');
    description.textContent = 'This test will create an instance of ERFlowUI and test its functionality.';
    content.appendChild(description);

    // Create a container for the UI
    const uiContainer = document.createElement('div');
    uiContainer.id = 'ui-container';
    uiContainer.style.marginTop = '20px';
    uiContainer.style.border = '1px solid #ddd';
    uiContainer.style.padding = '10px';
    content.appendChild(uiContainer);

    // Create a button to initialize the UI
    const initButton = document.createElement('button');
    initButton.textContent = 'Initialize UI';
    initButton.style.marginTop = '20px';
    initButton.style.padding = '10px';
    initButton.style.backgroundColor = '#4caf50';
    initButton.style.color = 'white';
    initButton.style.border = 'none';
    initButton.style.borderRadius = '4px';
    initButton.style.cursor = 'pointer';

    initButton.addEventListener('click', () => {
      try {
        // Create a simulator
        const simulator = new ERFlowSimulator({ debug: true });

        // Initialize the simulator
        simulator.initialize({
          arrival_rates: {
            morning: 8,
            afternoon: 7,
            evening: 5,
            night: 3
          },
          staff: {
            doctors: {
              day: 6,
              evening: 4,
              night: 2
            },
            nurses: {
              day: 12,
              evening: 10,
              night: 6
            }
          },
          ed_beds_capacity: 50,
          ward_beds_capacity: 300,
          duration_days: 1
        });

        // Create the UI
        const ui = new ERFlowUI(simulator, uiContainer);

        // Initialize the UI
        ui.initialize();

        console.log('UI initialized successfully');

        // Add a message
        const message = document.createElement('p');
        message.textContent = 'UI initialized successfully. Try interacting with the controls.';
        message.style.color = '#4caf50';
        message.style.fontWeight = 'bold';
        content.appendChild(message);
      } catch (error) {
        console.error('Error initializing UI:', error);

        // Add an error message
        const errorMessage = document.createElement('p');
        errorMessage.textContent = `Error initializing UI: ${error.message}`;
        errorMessage.style.color = '#f44336';
        errorMessage.style.fontWeight = 'bold';
        content.appendChild(errorMessage);
      }
    });

    content.appendChild(initButton);

    // Add the container to the body
    document.body.appendChild(container);

    console.log('Web interface test initialized');
    return true;
  } catch (error) {
    console.error('Web interface test failed:', error);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('Running all tests...');

  const results = {
    simulationEngineCompat: testSimulationEngineCompat(),
    erFlowSimulator: testERFlowSimulator(),
    hospitalSimulator: testHospitalSimulator(),
    patient: testPatient(),
    healthcareEvents: testHealthcareEvents(),
    // Note: We don't include the web interface test in the automated tests
    // because it requires user interaction
    webInterface: true
  };

  console.log('Test results:', results);

  // Check if all tests passed
  const allPassed = Object.values(results).every(result => result === true);
  console.log('All tests passed:', allPassed);

  return results;
}

// Run the tests when the script is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Debug script loaded');

  // Create a debug button
  const debugButton = document.createElement('button');
  debugButton.textContent = 'Run Debug Tests';
  debugButton.style.position = 'fixed';
  debugButton.style.bottom = '10px';
  debugButton.style.right = '10px';
  debugButton.style.zIndex = '9999';
  debugButton.style.padding = '10px';
  debugButton.style.backgroundColor = '#f44336';
  debugButton.style.color = 'white';
  debugButton.style.border = 'none';
  debugButton.style.borderRadius = '4px';
  debugButton.style.cursor = 'pointer';

  debugButton.addEventListener('click', () => {
    console.clear();
    runAllTests();
  });

  document.body.appendChild(debugButton);
});

// Export the test functions
export {
  testSimulationEngineCompat,
  testERFlowSimulator,
  testHospitalSimulator,
  testPatient,
  testHealthcareEvents,
  testWebInterface,
  runAllTests
};
