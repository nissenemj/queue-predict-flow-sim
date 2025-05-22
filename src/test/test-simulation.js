import SimulationEngine from '../simulators/SimulationEngine.js';
import Patient from '../models/Patient.js';
import { Staff, Bed } from '../models/Resource.js';

/**
 * Simple test script for the simulation engine
 */
class TestSimulation extends SimulationEngine {
  constructor() {
    super({ debug: true });
    
    // Register event handlers
    this.registerEventHandler('patient_arrival', this.handlePatientArrival.bind(this));
    this.registerEventHandler('treatment_complete', this.handleTreatmentComplete.bind(this));
    this.registerEventHandler('discharge', this.handleDischarge.bind(this));
  }
  
  initialize(config) {
    super.initialize(config);
    
    this.patientCounter = 0;
    this.treatedPatients = 0;
    this.dischargedPatients = 0;
    
    console.log('Test simulation initialized with config:', config);
  }
  
  _initializeResources() {
    // Add staff resources
    const doctors = new Staff('doctors', 'doctor', this.config.doctorCount || 3);
    const nurses = new Staff('nurses', 'nurse', this.config.nurseCount || 5);
    
    // Add bed resources
    const beds = new Bed('beds', 'bed', this.config.bedCount || 10);
    
    // Add resources to the simulation
    this.addResource('doctors', doctors);
    this.addResource('nurses', nurses);
    this.addResource('beds', beds);
    
    console.log('Resources initialized:');
    console.log('- Doctors:', doctors.capacity);
    console.log('- Nurses:', nurses.capacity);
    console.log('- Beds:', beds.capacity);
  }
  
  _scheduleInitialEvents() {
    // Schedule initial patient arrivals
    const patientCount = this.config.patientCount || 20;
    const simulationDuration = this.config.duration || 480; // 8 hours in minutes
    
    console.log(`Scheduling ${patientCount} patient arrivals over ${simulationDuration} minutes`);
    
    // Schedule patients with random arrival times
    for (let i = 0; i < patientCount; i++) {
      const arrivalTime = Math.random() * simulationDuration;
      this.scheduleEvent(arrivalTime, null, 'patient_arrival');
    }
    
    // Schedule hourly statistics collection
    for (let hour = 1; hour <= Math.ceil(simulationDuration / 60); hour++) {
      this.scheduleEvent(hour * 60, null, 'collect_stats');
    }
  }
  
  handlePatientArrival(event) {
    // Create a new patient
    this.patientCounter++;
    const patient = new Patient(this.patientCounter, event.time);
    
    // Add patient to the simulation
    this.addEntity(patient);
    
    console.log(`Patient ${patient.id} arrived at time ${event.time.toFixed(2)}`);
    console.log(`- Acuity level: ${patient.acuityLevel}`);
    console.log(`- Age: ${patient.age}`);
    console.log(`- Comorbidities: ${patient.comorbidities.length}`);
    
    // Try to allocate resources to the patient
    const doctors = this.getResource('doctors');
    const nurses = this.getResource('nurses');
    const beds = this.getResource('beds');
    
    // Check if resources are available
    if (doctors.isAvailable() && nurses.isAvailable() && beds.isAvailable()) {
      // Allocate resources
      this.allocateResource('doctors', patient);
      this.allocateResource('nurses', patient);
      this.allocateResource('beds', patient);
      
      // Set patient status and location
      patient.setStatus('in_treatment', event.time);
      patient.setLocation('treatment_room', event.time);
      
      // Calculate treatment time based on patient attributes
      const treatmentTime = patient.getExpectedTreatmentTime();
      
      // Schedule treatment completion
      this.scheduleEvent(event.time + treatmentTime, patient, 'treatment_complete');
      
      console.log(`Patient ${patient.id} allocated resources and treatment started`);
      console.log(`- Expected treatment time: ${treatmentTime.toFixed(2)} minutes`);
    } else {
      // Put patient in waiting queue
      patient.setStatus('waiting', event.time);
      patient.setLocation('waiting_room', event.time);
      
      // Schedule resource check in 10 minutes
      this.scheduleEvent(event.time + 10, patient, 'check_resources');
      
      console.log(`Patient ${patient.id} waiting for resources`);
      console.log(`- Doctors available: ${doctors.available}/${doctors.capacity}`);
      console.log(`- Nurses available: ${nurses.available}/${nurses.capacity}`);
      console.log(`- Beds available: ${beds.available}/${beds.capacity}`);
    }
  }
  
  handleTreatmentComplete(event) {
    const patient = event.entity;
    
    console.log(`Patient ${patient.id} treatment completed at time ${event.time.toFixed(2)}`);
    
    // Update patient status
    patient.setStatus('treated', event.time);
    
    // Release doctor and nurse resources
    this.releaseResource('doctors', patient);
    this.releaseResource('nurses', patient);
    
    // Increment treated patients counter
    this.treatedPatients++;
    
    // Schedule discharge
    const dischargeDelay = 30 + Math.random() * 30; // 30-60 minutes for discharge process
    this.scheduleEvent(event.time + dischargeDelay, patient, 'discharge');
    
    console.log(`Patient ${patient.id} scheduled for discharge in ${dischargeDelay.toFixed(2)} minutes`);
    
    // Check if there are waiting patients
    const waitingPatients = this.entityManager.queryEntities(
      entity => entity.status === 'waiting'
    );
    
    if (waitingPatients.length > 0) {
      // Sort by arrival time (oldest first)
      waitingPatients.sort((a, b) => a.arrivalTime - b.arrivalTime);
      
      // Get the next patient
      const nextPatient = waitingPatients[0];
      
      // Schedule resource check for the next patient
      this.scheduleEvent(event.time + 1, nextPatient, 'check_resources');
      
      console.log(`Scheduled resource check for waiting patient ${nextPatient.id}`);
    }
  }
  
  handleDischarge(event) {
    const patient = event.entity;
    
    console.log(`Patient ${patient.id} discharged at time ${event.time.toFixed(2)}`);
    
    // Update patient status
    patient.setStatus('discharged', event.time);
    
    // Release bed resource
    this.releaseResource('beds', patient);
    
    // Increment discharged patients counter
    this.dischargedPatients++;
    
    // Remove patient from simulation
    this.removeEntity(patient);
    
    // Check if there are waiting patients
    const waitingPatients = this.entityManager.queryEntities(
      entity => entity.status === 'waiting'
    );
    
    if (waitingPatients.length > 0) {
      // Sort by arrival time (oldest first)
      waitingPatients.sort((a, b) => a.arrivalTime - b.arrivalTime);
      
      // Get the next patient
      const nextPatient = waitingPatients[0];
      
      // Schedule resource check for the next patient
      this.scheduleEvent(event.time + 1, nextPatient, 'check_resources');
      
      console.log(`Scheduled resource check for waiting patient ${nextPatient.id}`);
    }
  }
  
  _processEvent(event) {
    // Handle events not covered by registered handlers
    switch (event.eventType) {
      case 'check_resources':
        this.handleCheckResources(event);
        break;
      case 'collect_stats':
        this.handleCollectStats(event);
        break;
      default:
        // Event is handled by registered handlers or ignored
        break;
    }
  }
  
  handleCheckResources(event) {
    const patient = event.entity;
    
    if (patient.status !== 'waiting') {
      // Patient is no longer waiting, ignore the event
      return;
    }
    
    console.log(`Checking resources for patient ${patient.id} at time ${event.time.toFixed(2)}`);
    
    // Check if resources are available
    const doctors = this.getResource('doctors');
    const nurses = this.getResource('nurses');
    const beds = this.getResource('beds');
    
    if (doctors.isAvailable() && nurses.isAvailable() && beds.isAvailable()) {
      // Allocate resources
      this.allocateResource('doctors', patient);
      this.allocateResource('nurses', patient);
      this.allocateResource('beds', patient);
      
      // Set patient status and location
      patient.setStatus('in_treatment', event.time);
      patient.setLocation('treatment_room', event.time);
      
      // Calculate treatment time based on patient attributes
      const treatmentTime = patient.getExpectedTreatmentTime();
      
      // Schedule treatment completion
      this.scheduleEvent(event.time + treatmentTime, patient, 'treatment_complete');
      
      console.log(`Patient ${patient.id} allocated resources and treatment started`);
      console.log(`- Expected treatment time: ${treatmentTime.toFixed(2)} minutes`);
    } else {
      // Resources not available, schedule another check in 10 minutes
      this.scheduleEvent(event.time + 10, patient, 'check_resources');
      
      console.log(`Patient ${patient.id} still waiting for resources`);
      console.log(`- Doctors available: ${doctors.available}/${doctors.capacity}`);
      console.log(`- Nurses available: ${nurses.available}/${nurses.capacity}`);
      console.log(`- Beds available: ${beds.available}/${beds.capacity}`);
    }
  }
  
  handleCollectStats(event) {
    const hour = Math.floor(event.time / 60);
    
    console.log(`\n=== Statistics at hour ${hour} (time ${event.time}) ===`);
    
    // Get resource utilization
    const doctors = this.getResource('doctors');
    const nurses = this.getResource('nurses');
    const beds = this.getResource('beds');
    
    console.log('Resource utilization:');
    console.log(`- Doctors: ${((1 - doctors.available / doctors.capacity) * 100).toFixed(1)}%`);
    console.log(`- Nurses: ${((1 - nurses.available / nurses.capacity) * 100).toFixed(1)}%`);
    console.log(`- Beds: ${((1 - beds.available / beds.capacity) * 100).toFixed(1)}%`);
    
    // Get patient statistics
    const activePatients = this.entityManager.getAllEntities().length;
    const waitingPatients = this.entityManager.queryEntities(
      entity => entity.status === 'waiting'
    ).length;
    const inTreatmentPatients = this.entityManager.queryEntities(
      entity => entity.status === 'in_treatment'
    ).length;
    
    console.log('Patient statistics:');
    console.log(`- Active patients: ${activePatients}`);
    console.log(`- Waiting patients: ${waitingPatients}`);
    console.log(`- In treatment: ${inTreatmentPatients}`);
    console.log(`- Treated: ${this.treatedPatients}`);
    console.log(`- Discharged: ${this.dischargedPatients}`);
    
    // Calculate average wait time for patients in treatment
    const treatedPatients = this.entityManager.queryEntities(
      entity => entity.status === 'in_treatment' || entity.status === 'treated'
    );
    
    if (treatedPatients.length > 0) {
      const totalWaitTime = treatedPatients.reduce((sum, patient) => {
        return sum + (patient.waitingTimes.time_in_waiting || 0);
      }, 0);
      
      const avgWaitTime = totalWaitTime / treatedPatients.length;
      
      console.log(`- Average wait time: ${avgWaitTime.toFixed(1)} minutes`);
    }
    
    console.log('=======================================\n');
  }
  
  collectResults() {
    const results = super.collectResults();
    
    // Add custom results
    results.patientStats = {
      total: this.patientCounter,
      treated: this.treatedPatients,
      discharged: this.dischargedPatients
    };
    
    // Get resource utilization
    const doctors = this.getResource('doctors');
    const nurses = this.getResource('nurses');
    const beds = this.getResource('beds');
    
    results.resourceStats = {
      doctors: {
        capacity: doctors.capacity,
        utilization: (1 - doctors.available / doctors.capacity) * 100
      },
      nurses: {
        capacity: nurses.capacity,
        utilization: (1 - nurses.available / nurses.capacity) * 100
      },
      beds: {
        capacity: beds.capacity,
        utilization: (1 - beds.available / beds.capacity) * 100
      }
    };
    
    return results;
  }
}

// Run the test simulation
const runTest = () => {
  console.log('Starting test simulation...');
  
  const simulation = new TestSimulation();
  
  // Initialize with configuration
  simulation.initialize({
    doctorCount: 3,
    nurseCount: 5,
    bedCount: 10,
    patientCount: 30,
    duration: 480 // 8 hours in minutes
  });
  
  // Run the simulation
  const results = simulation.run(480);
  
  console.log('\n=== Simulation Results ===');
  console.log('Patient statistics:');
  console.log(`- Total patients: ${results.patientStats.total}`);
  console.log(`- Treated patients: ${results.patientStats.treated}`);
  console.log(`- Discharged patients: ${results.patientStats.discharged}`);
  
  console.log('\nResource utilization:');
  console.log(`- Doctors: ${results.resourceStats.doctors.utilization.toFixed(1)}%`);
  console.log(`- Nurses: ${results.resourceStats.nurses.utilization.toFixed(1)}%`);
  console.log(`- Beds: ${results.resourceStats.beds.utilization.toFixed(1)}%`);
  
  console.log('\nSimulation statistics:');
  console.log(`- Processing time: ${results.stats.processingTime} ms`);
  console.log(`- Events processed: ${results.stats.eventCount}`);
  console.log(`- Entities: ${results.stats.entityCount}`);
  console.log(`- Resources: ${results.stats.resourceCount}`);
  
  console.log('===========================');
};

// Export the test function
export default runTest;
