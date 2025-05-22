/**
 * Patient class representing a patient in the hospital simulation
 */
class Patient {
  /**
   * Constructor for the Patient class
   * @param {number} id - Unique identifier for the patient
   * @param {number} arrivalTime - Time when the patient arrives
   * @param {Object} attributes - Additional patient attributes
   */
  constructor(id, arrivalTime, attributes = {}) {
    this.id = id;
    this.arrivalTime = arrivalTime;
    this.acuityLevel = attributes.acuityLevel || this.generateAcuityLevel();
    this.age = attributes.age || this.generateAge();
    this.comorbidities = attributes.comorbidities || this.generateComorbidities();
    this.currentLocation = null;
    this.status = 'waiting'; // waiting, in_treatment, discharged, transferred
    this.treatmentPath = [];
    this.waitingTimes = {};
    this.treatmentTimes = {};
    this.discharged = false;
    this.dischargeTime = null;
    this.totalLengthOfStay = 0;
  }

  /**
   * Generate a random acuity level (ESI triage level 1-5)
   * @returns {number} - Acuity level (1-5)
   */
  generateAcuityLevel() {
    // Distribution based on typical emergency department data
    // ESI 1: 1-3% (Resuscitation)
    // ESI 2: 10-20% (Emergent)
    // ESI 3: 30-40% (Urgent)
    // ESI 4: 20-35% (Less Urgent)
    // ESI 5: 5-10% (Non-Urgent)
    const rand = Math.random();
    if (rand < 0.02) return 1; // Resuscitation
    if (rand < 0.20) return 2; // Emergent
    if (rand < 0.60) return 3; // Urgent
    if (rand < 0.90) return 4; // Less Urgent
    return 5; // Non-Urgent
  }

  /**
   * Generate a random age for the patient
   * @returns {number} - Age in years
   */
  generateAge() {
    // Age distribution based on typical emergency department data
    const rand = Math.random();
    if (rand < 0.15) return Math.floor(Math.random() * 18); // 0-17 years
    if (rand < 0.60) return 18 + Math.floor(Math.random() * 47); // 18-64 years
    return 65 + Math.floor(Math.random() * 36); // 65+ years
  }

  /**
   * Generate random comorbidities for the patient
   * @returns {Array} - Array of comorbidity objects
   */
  generateComorbidities() {
    const comorbidities = [];
    const possibleComorbidities = [
      { name: 'Hypertension', prevalence: 0.3, severity: 1, impact: 0.1 },
      { name: 'Diabetes', prevalence: 0.1, severity: 2, impact: 0.2 },
      { name: 'Heart Disease', prevalence: 0.08, severity: 3, impact: 0.3 },
      { name: 'COPD', prevalence: 0.06, severity: 3, impact: 0.25 },
      { name: 'Asthma', prevalence: 0.08, severity: 2, impact: 0.15 },
      { name: 'Cancer', prevalence: 0.05, severity: 4, impact: 0.4 },
      { name: 'Stroke', prevalence: 0.03, severity: 4, impact: 0.35 },
      { name: 'Kidney Disease', prevalence: 0.02, severity: 3, impact: 0.3 },
      { name: 'Liver Disease', prevalence: 0.01, severity: 3, impact: 0.3 },
      { name: 'Obesity', prevalence: 0.3, severity: 2, impact: 0.15 }
    ];

    // Older patients are more likely to have comorbidities
    const ageMultiplier = this.age < 18 ? 0.3 : this.age < 65 ? 1.0 : 2.0;
    
    possibleComorbidities.forEach(comorbidity => {
      if (Math.random() < comorbidity.prevalence * ageMultiplier) {
        comorbidities.push({ ...comorbidity });
      }
    });

    return comorbidities;
  }

  /**
   * Calculate the total comorbidity impact factor
   * @returns {number} - Impact factor (0-1)
   */
  getComorbidityImpact() {
    if (!this.comorbidities.length) return 0;
    
    // Calculate the combined impact of all comorbidities
    // Using a diminishing returns formula to avoid unrealistic values
    const totalImpact = this.comorbidities.reduce((sum, comorbidity) => sum + comorbidity.impact, 0);
    return Math.min(0.8, totalImpact); // Cap at 0.8 (80% increase)
  }

  /**
   * Set the patient's current location
   * @param {string} location - The location identifier
   * @param {number} time - The current simulation time
   */
  setLocation(location, time) {
    // Record time spent at previous location
    if (this.currentLocation) {
      const locationKey = `time_at_${this.currentLocation}`;
      this.treatmentTimes[locationKey] = (this.treatmentTimes[locationKey] || 0) + 
        (time - (this.locationChangeTime || this.arrivalTime));
    }
    
    this.currentLocation = location;
    this.locationChangeTime = time;
  }

  /**
   * Update the patient's status
   * @param {string} status - New status
   * @param {number} time - The current simulation time
   */
  setStatus(status, time) {
    // Record time spent in previous status
    const statusKey = `time_in_${this.status}`;
    this.waitingTimes[statusKey] = (this.waitingTimes[statusKey] || 0) + 
      (time - (this.statusChangeTime || this.arrivalTime));
    
    this.status = status;
    this.statusChangeTime = time;
    
    // Add to treatment path
    this.treatmentPath.push({
      time,
      status,
      location: this.currentLocation
    });
    
    // Handle discharge
    if (status === 'discharged') {
      this.discharged = true;
      this.dischargeTime = time;
      this.totalLengthOfStay = time - this.arrivalTime;
    }
  }

  /**
   * Calculate the expected treatment time based on acuity and comorbidities
   * @returns {number} - Expected treatment time in minutes
   */
  getExpectedTreatmentTime() {
    // Base treatment time by acuity level (in minutes)
    const baseTimes = {
      1: 240, // Resuscitation: 4 hours
      2: 180, // Emergent: 3 hours
      3: 120, // Urgent: 2 hours
      4: 60,  // Less Urgent: 1 hour
      5: 30   // Non-Urgent: 30 minutes
    };
    
    const baseTime = baseTimes[this.acuityLevel] || 120;
    
    // Adjust for comorbidities
    const comorbidityFactor = 1 + this.getComorbidityImpact();
    
    // Adjust for age (elderly patients may need more time)
    const ageFactor = this.age >= 65 ? 1.2 : 1.0;
    
    return baseTime * comorbidityFactor * ageFactor;
  }

  /**
   * Calculate the probability of admission to inpatient ward
   * @returns {number} - Probability (0-1)
   */
  getAdmissionProbability() {
    // Base admission probability by acuity level
    const baseProb = {
      1: 0.9,  // Resuscitation: 90%
      2: 0.7,  // Emergent: 70%
      3: 0.4,  // Urgent: 40%
      4: 0.1,  // Less Urgent: 10%
      5: 0.02  // Non-Urgent: 2%
    };
    
    const baseProbability = baseProb[this.acuityLevel] || 0.3;
    
    // Adjust for comorbidities
    const comorbidityFactor = 1 + this.getComorbidityImpact();
    
    // Adjust for age (elderly patients more likely to be admitted)
    const ageFactor = this.age >= 65 ? 1.3 : this.age <= 5 ? 1.2 : 1.0;
    
    // Calculate final probability, capped at 0.95
    return Math.min(0.95, baseProbability * comorbidityFactor * ageFactor);
  }
}

// Export the Patient class
export default Patient;
