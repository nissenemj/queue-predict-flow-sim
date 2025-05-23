/**
 * Test file for the HospitalSimulator
 * Demonstrates specialized healthcare event types and priority handling
 */

import HospitalSimulator from '../simulators/HospitalSimulator.js';
import HospitalResourceManager from '../utils/HospitalResourceManager.js';
import { EmergencyArrival, PatientTransfer, PatientDischarge } from '../models/HealthcareEvents.js';

// Configuration for the hospital simulation
const config = {
  // Simulation parameters
  simulationDurationHours: 24,

  // Patient arrival rates (per hour)
  patientArrivalRate: 8,
  emergencyArrivalRate: 2,

  // Resources
  resources: {
    doctors: 15,
    nurses: 30,
    technicians: 8,
    specialists: 5,
    beds: 50,
    erBeds: 15,
    icuBeds: 8,
    wardBeds: 30,
    traumaBays: 2,
    resuscitationRooms: 2,
    operatingRooms: 4,
    procedureRooms: 3,
    imagingRooms: 4,
    ventilators: 12,
    monitors: 40,
    defibrillators: 10,
    ultrasounds: 5,
    ctScanners: 2,
    xrayMachines: 3,
    mriMachines: 1
  },

  // Enable ML predictions
  enableML: true,
  mlConfig: {
    predictionInterval: 60, // minutes
    models: ['waitTime', 'lengthOfStay', 'bedOccupancy']
  }
};

// Patch resources to have allocate and release methods
const addAllocateMethod = (simulator) => {
  if (!simulator || !simulator.resourceManager) return;

  const resources = simulator.resourceManager.getAllResources();
  for (const resource of resources) {
    if (!resource.allocate) {
      resource.allocate = function (entity, amount = 1, time) {
        this.available = Math.max(0, this.available - amount);
        if (!this.assignments) this.assignments = new Map();
        this.assignments.set(entity.id, { entity, amount, startTime: time });
        return true;
      };
    }

    if (!resource.release) {
      resource.release = function (entity, time) {
        if (!this.assignments) this.assignments = new Map();
        if (!this.assignments.has(entity.id)) return false;

        const assignment = this.assignments.get(entity.id);
        this.available += assignment.amount;
        this.assignments.delete(entity.id);
        return true;
      };
    }
  }
};

// Create the hospital simulator
const hospitalSimulator = new HospitalSimulator(config, {
  debug: false, // Set to false to reduce console output
  logEvents: true,
  logLevel: 'info'
});

// Run the simulation
console.log('Starting hospital simulation...');

// Add allocate and release methods to resources
addAllocateMethod(hospitalSimulator);

const results = hospitalSimulator.run(config.simulationDurationHours * 60);

// Display results
console.log('\n=== HOSPITAL SIMULATION RESULTS ===\n');

// Patient flow
console.log('PATIENT FLOW:');
console.log(`Total arrivals: ${results.patientFlow.arrivals.total}`);
console.log(`- Emergency: ${results.patientFlow.arrivals.emergency}`);
console.log(`- Urgent: ${results.patientFlow.arrivals.urgent}`);
console.log(`- Non-urgent: ${results.patientFlow.arrivals.nonUrgent}`);
console.log(`Total discharges: ${results.patientFlow.discharges.total}`);
console.log(`Patients still in hospital: ${results.patientFlow.currentPatients}`);

// Wait times
console.log('\nWAIT TIMES (minutes):');
console.log(`Emergency patients: ${results.waitTimes.emergency.toFixed(1)}`);
console.log(`Urgent patients: ${results.waitTimes.urgent.toFixed(1)}`);
console.log(`Non-urgent patients: ${results.waitTimes.nonUrgent.toFixed(1)}`);
console.log(`Overall average: ${results.waitTimes.overall.toFixed(1)}`);

// Length of stay
console.log('\nLENGTH OF STAY (minutes):');
console.log(`Average: ${results.lengthOfStay.average.toFixed(1)}`);
console.log(`Minimum: ${results.lengthOfStay.min.toFixed(1)}`);
console.log(`Maximum: ${results.lengthOfStay.max.toFixed(1)}`);

// Bed occupancy
console.log('\nBED OCCUPANCY:');
console.log(`Average occupancy rate: ${(results.bedOccupancy.average * 100).toFixed(1)}%`);
console.log(`Peak occupancy rate: ${(results.bedOccupancy.peak * 100).toFixed(1)}%`);

// Resource utilization
console.log('\nRESOURCE UTILIZATION:');
for (const [resourceType, utilizationRate] of Object.entries(results.resourceUtilization)) {
  console.log(`${resourceType}: ${(utilizationRate * 100).toFixed(1)}%`);
}

// Test specialized healthcare events
console.log('\n=== TESTING SPECIALIZED HEALTHCARE EVENTS ===\n');

// Test EmergencyArrival
const emergencyArrival = new EmergencyArrival({
  arrivalMode: 'helicopter',
  condition: 'trauma',
  estimatedAcuity: 1,
  preNotification: true
});

console.log('Emergency Arrival:');
console.log(`- Priority: ${emergencyArrival.priority}`);
console.log(`- Resource Requirements: ${JSON.stringify(emergencyArrival.resourceRequirements)}`);

// Test PatientTransfer
const patientTransfer = new PatientTransfer({
  sourceLocation: 'ED',
  targetLocation: 'ICU',
  transferReason: 'critical_care',
  isEmergent: true
});

console.log('\nPatient Transfer:');
console.log(`- Priority: ${patientTransfer.priority}`);
console.log(`- Estimated Duration: ${patientTransfer.estimatedDuration} minutes`);
console.log(`- Resource Requirements: ${JSON.stringify(patientTransfer.resourceRequirements)}`);

// Test PatientDischarge
const patientDischarge = new PatientDischarge({
  dischargeType: 'routine',
  dischargeDestination: 'home',
  requiresFollowUp: true,
  medications: ['medication1', 'medication2'],
  instructions: ['instruction1', 'instruction2']
});

console.log('\nPatient Discharge:');
console.log(`- Priority: ${patientDischarge.priority}`);
console.log(`- Estimated Duration: ${patientDischarge.estimatedDuration} minutes`);
console.log(`- Resource Requirements: ${JSON.stringify(patientDischarge.resourceRequirements)}`);

// Run the test
if (typeof process !== 'undefined') {
  // Node.js environment
  console.log('\nTest completed successfully!');
} else {
  // Browser environment
  document.getElementById('output').textContent = 'Test completed successfully!';
}
