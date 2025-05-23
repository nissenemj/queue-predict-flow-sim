/**
 * HospitalResourceManager.js
 * Extends the ResourceManager with healthcare-specific functionality
 * and priority-based resource allocation
 */

import ResourceManager from './ResourceManager.js';
import PriorityQueue from './PriorityQueue.js';

/**
 * HospitalResourceManager class for managing hospital resources with priority handling
 * Extends the base ResourceManager with healthcare-specific functionality
 */
class HospitalResourceManager extends ResourceManager {
  /**
   * Constructor for HospitalResourceManager
   * @param {Object} config - Configuration for resources
   * @param {Object} logger - Logger instance
   */
  constructor(config, logger) {
    super();
    this.config = config || {};
    this.logger = logger;

    // Initialize resource pools for different departments
    this.departments = new Map();

    // Priority queue for resource requests
    this.requestQueue = new PriorityQueue();

    // Emergency reserve resources (kept for high-priority cases)
    this.emergencyReserve = {
      doctors: Math.max(1, Math.floor((config?.resources?.doctors || 10) * 0.1)),
      nurses: Math.max(2, Math.floor((config?.resources?.nurses || 20) * 0.1)),
      beds: Math.max(2, Math.floor((config?.resources?.beds || 50) * 0.05)),
      ventilators: Math.max(1, Math.floor((config?.resources?.ventilators || 10) * 0.2))
    };

    // Initialize hospital resources
    this.initializeHospitalResources();
  }

  /**
   * Initialize hospital resources
   */
  initializeHospitalResources() {
    // Create departments
    this.createDepartment('emergency', 'Emergency Department');
    this.createDepartment('icu', 'Intensive Care Unit');
    this.createDepartment('ward', 'General Ward');
    this.createDepartment('or', 'Operating Room');
    this.createDepartment('radiology', 'Radiology');
    this.createDepartment('laboratory', 'Laboratory');

    // Create staff resources
    this.createStaffResources();

    // Create physical resources
    this.createPhysicalResources();

    // Create equipment resources
    this.createEquipmentResources();
  }

  /**
   * Create a department
   * @param {string} id - Department ID
   * @param {string} name - Department name
   */
  createDepartment(id, name) {
    this.departments.set(id, {
      id,
      name,
      resources: new Set(),
      capacity: 0,
      occupancy: 0,
      waitingList: new PriorityQueue()
    });
  }

  /**
   * Create staff resources
   */
  createStaffResources() {
    const config = this.config.resources || {};

    // Create doctors
    for (let i = 0; i < (config.doctors || 10); i++) {
      const doctor = {
        id: `doctor_${i + 1}`,
        type: 'staff',
        subtype: 'doctor',
        specialty: this.getRandomSpecialty(),
        capacity: 1,
        available: 1,
        skills: this.generateSkills('doctor'),
        efficiency: 0.8 + (Math.random() * 0.4), // 0.8 to 1.2
        fatigue: 0,
        assignments: new Map(),
        isReservedForEmergency: i < this.emergencyReserve.doctors
      };

      this.addResource(doctor);

      // Assign to departments
      if (doctor.specialty === 'emergency') {
        this.addResourceToPool(doctor.id, 'emergency');
      } else if (doctor.specialty === 'critical_care') {
        this.addResourceToPool(doctor.id, 'icu');
      } else if (doctor.specialty === 'surgery') {
        this.addResourceToPool(doctor.id, 'or');
      } else {
        this.addResourceToPool(doctor.id, 'ward');
      }
    }

    // Create nurses
    for (let i = 0; i < (config.nurses || 20); i++) {
      const nurse = {
        id: `nurse_${i + 1}`,
        type: 'staff',
        subtype: 'nurse',
        specialty: this.getRandomNurseSpecialty(),
        capacity: 1,
        available: 1,
        skills: this.generateSkills('nurse'),
        efficiency: 0.9 + (Math.random() * 0.2), // 0.9 to 1.1
        fatigue: 0,
        assignments: new Map(),
        isReservedForEmergency: i < this.emergencyReserve.nurses
      };

      this.addResource(nurse);

      // Assign to departments
      if (nurse.specialty === 'emergency') {
        this.addResourceToPool(nurse.id, 'emergency');
      } else if (nurse.specialty === 'critical_care') {
        this.addResourceToPool(nurse.id, 'icu');
      } else if (nurse.specialty === 'surgical') {
        this.addResourceToPool(nurse.id, 'or');
      } else {
        this.addResourceToPool(nurse.id, 'ward');
      }
    }

    // Create technicians
    for (let i = 0; i < (config.technicians || 5); i++) {
      const tech = {
        id: `tech_${i + 1}`,
        type: 'staff',
        subtype: 'technician',
        specialty: this.getRandomTechSpecialty(),
        capacity: 1,
        available: 1,
        skills: this.generateSkills('technician'),
        efficiency: 0.9 + (Math.random() * 0.2), // 0.9 to 1.1
        fatigue: 0,
        assignments: new Map()
      };

      this.addResource(tech);

      // Assign to departments
      if (tech.specialty === 'radiology') {
        this.addResourceToPool(tech.id, 'radiology');
      } else if (tech.specialty === 'laboratory') {
        this.addResourceToPool(tech.id, 'laboratory');
      } else {
        this.addResourceToPool(tech.id, 'emergency');
      }
    }
  }

  /**
   * Create physical resources
   */
  createPhysicalResources() {
    const config = this.config.resources || {};

    // Create beds
    this.createBeds('er_bed', 'emergency', config.erBeds || 15);
    this.createBeds('icu_bed', 'icu', config.icuBeds || 8);
    this.createBeds('ward_bed', 'ward', config.wardBeds || 30);

    // Create rooms
    this.createRooms('trauma_bay', 'emergency', config.traumaBays || 2);
    this.createRooms('resuscitation_room', 'emergency', config.resuscitationRooms || 2);
    this.createRooms('operating_room', 'or', config.operatingRooms || 5);
    this.createRooms('procedure_room', 'emergency', config.procedureRooms || 3);
    this.createRooms('imaging_room', 'radiology', config.imagingRooms || 4);
  }

  /**
   * Create equipment resources
   */
  createEquipmentResources() {
    const config = this.config.resources || {};

    // Create ventilators
    for (let i = 0; i < (config.ventilators || 10); i++) {
      const ventilator = {
        id: `ventilator_${i + 1}`,
        type: 'equipment',
        subtype: 'ventilator',
        capacity: 1,
        available: 1,
        condition: 1.0, // 0.0 to 1.0
        assignments: new Map(),
        isReservedForEmergency: i < this.emergencyReserve.ventilators
      };

      this.addResource(ventilator);

      // Assign to departments
      if (i < (config.ventilators || 10) * 0.3) {
        this.addResourceToPool(ventilator.id, 'emergency');
      } else if (i < (config.ventilators || 10) * 0.8) {
        this.addResourceToPool(ventilator.id, 'icu');
      } else {
        this.addResourceToPool(ventilator.id, 'or');
      }
    }

    // Create other equipment types
    this.createEquipment('monitor', config.monitors || 30);
    this.createEquipment('defibrillator', config.defibrillators || 8);
    this.createEquipment('ultrasound', config.ultrasounds || 4);
    this.createEquipment('ct_scanner', config.ctScanners || 2);
    this.createEquipment('xray_machine', config.xrayMachines || 3);
    this.createEquipment('mri_machine', config.mriMachines || 1);
  }

  /**
   * Create beds
   * @param {string} type - Bed type
   * @param {string} department - Department ID
   * @param {number} count - Number of beds to create
   */
  createBeds(type, department, count) {
    for (let i = 0; i < count; i++) {
      const bed = {
        id: `${type}_${i + 1}`,
        type: 'physical',
        subtype: 'bed',
        bedType: type,
        capacity: 1,
        available: 1,
        inTurnover: false,
        turnoverTime: 0,
        assignments: new Map(),
        isReservedForEmergency: type === 'er_bed' && i < this.emergencyReserve.beds
      };

      this.addResource(bed);
      this.addResourceToPool(bed.id, department);

      // Update department capacity
      const dept = this.departments.get(department);
      if (dept) {
        dept.capacity++;
        dept.resources.add(bed.id);
      }
    }
  }

  /**
   * Create rooms
   * @param {string} type - Room type
   * @param {string} department - Department ID
   * @param {number} count - Number of rooms to create
   */
  createRooms(type, department, count) {
    for (let i = 0; i < count; i++) {
      const room = {
        id: `${type}_${i + 1}`,
        type: 'physical',
        subtype: 'room',
        roomType: type,
        capacity: type === 'operating_room' ? 1 :
          type === 'trauma_bay' ? 1 :
            type === 'resuscitation_room' ? 1 : 2,
        available: type === 'operating_room' ? 1 :
          type === 'trauma_bay' ? 1 :
            type === 'resuscitation_room' ? 1 : 2,
        inTurnover: false,
        turnoverTime: 0,
        assignments: new Map()
      };

      this.addResource(room);
      this.addResourceToPool(room.id, department);

      // Update department capacity
      const dept = this.departments.get(department);
      if (dept) {
        dept.resources.add(room.id);
      }
    }
  }

  /**
   * Create equipment
   * @param {string} type - Equipment type
   * @param {number} count - Number of equipment to create
   */
  createEquipment(type, count) {
    for (let i = 0; i < count; i++) {
      const equipment = {
        id: `${type}_${i + 1}`,
        type: 'equipment',
        subtype: type,
        capacity: 1,
        available: 1,
        condition: 0.9 + (Math.random() * 0.1), // 0.9 to 1.0
        assignments: new Map()
      };

      this.addResource(equipment);

      // Assign to departments based on equipment type
      if (type === 'monitor') {
        if (i < count * 0.3) {
          this.addResourceToPool(equipment.id, 'emergency');
        } else if (i < count * 0.6) {
          this.addResourceToPool(equipment.id, 'icu');
        } else if (i < count * 0.8) {
          this.addResourceToPool(equipment.id, 'or');
        } else {
          this.addResourceToPool(equipment.id, 'ward');
        }
      } else if (type === 'defibrillator') {
        if (i < count * 0.5) {
          this.addResourceToPool(equipment.id, 'emergency');
        } else if (i < count * 0.7) {
          this.addResourceToPool(equipment.id, 'icu');
        } else {
          this.addResourceToPool(equipment.id, 'or');
        }
      } else if (type === 'ultrasound') {
        if (i < count * 0.5) {
          this.addResourceToPool(equipment.id, 'emergency');
        } else {
          this.addResourceToPool(equipment.id, 'radiology');
        }
      } else if (type === 'ct_scanner' || type === 'xray_machine' || type === 'mri_machine') {
        this.addResourceToPool(equipment.id, 'radiology');
      }
    }
  }

  /**
   * Get a random specialty for doctors
   * @returns {string} - Random specialty
   */
  getRandomSpecialty() {
    const specialties = [
      'emergency', 'critical_care', 'surgery', 'internal_medicine',
      'cardiology', 'neurology', 'orthopedics', 'pediatrics'
    ];
    return specialties[Math.floor(Math.random() * specialties.length)];
  }

  /**
   * Get a random specialty for nurses
   * @returns {string} - Random specialty
   */
  getRandomNurseSpecialty() {
    const specialties = [
      'emergency', 'critical_care', 'surgical', 'medical',
      'pediatric', 'geriatric', 'oncology', 'psychiatric'
    ];
    return specialties[Math.floor(Math.random() * specialties.length)];
  }

  /**
   * Get a random specialty for technicians
   * @returns {string} - Random specialty
   */
  getRandomTechSpecialty() {
    const specialties = [
      'radiology', 'laboratory', 'respiratory', 'surgical',
      'emergency', 'cardiology'
    ];
    return specialties[Math.floor(Math.random() * specialties.length)];
  }

  /**
   * Generate skills for a staff member
   * @param {string} staffType - Type of staff
   * @returns {Object} - Skills object
   */
  generateSkills(staffType) {
    const skills = {};

    if (staffType === 'doctor') {
      skills.diagnosis = 0.7 + (Math.random() * 0.3);
      skills.treatment = 0.7 + (Math.random() * 0.3);
      skills.surgery = Math.random() * 0.8;
      skills.emergency = 0.5 + (Math.random() * 0.5);
    } else if (staffType === 'nurse') {
      skills.patientCare = 0.7 + (Math.random() * 0.3);
      skills.medication = 0.7 + (Math.random() * 0.3);
      skills.triage = 0.5 + (Math.random() * 0.5);
      skills.emergency = 0.5 + (Math.random() * 0.5);
    } else if (staffType === 'technician') {
      skills.equipment = 0.7 + (Math.random() * 0.3);
      skills.laboratory = 0.5 + (Math.random() * 0.5);
      skills.imaging = 0.5 + (Math.random() * 0.5);
    }

    return skills;
  }

  /**
   * Request resources with priority handling
   * @param {Object} entity - Entity requesting resources (usually a patient)
   * @param {Object} requirements - Resource requirements
   * @param {number} priority - Priority of the request (higher = more urgent)
   * @param {number} time - Current simulation time
   * @returns {Object} - Result of the request
   */
  requestResources(entity, requirements, priority, time) {
    // Create a request object
    const request = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity,
      requirements,
      priority,
      time,
      status: 'pending',
      allocatedResources: []
    };

    // Check if this is an emergency request
    const isEmergency = priority >= 80;

    // Try to fulfill the request immediately
    const result = this.tryFulfillRequest(request, isEmergency);

    if (result.fulfilled) {
      request.status = 'fulfilled';

      if (this.logger) {
        this.logger.info('resource', `Resource request fulfilled for ${entity.id}`, entity, {
          priority,
          requirements,
          allocatedResources: request.allocatedResources
        }, time);
      }

      return {
        success: true,
        request,
        message: 'Resource request fulfilled'
      };
    } else {
      // Add to waiting queue with priority
      this.requestQueue.enqueue(request, -priority); // Negative priority so higher priority comes first

      if (this.logger) {
        this.logger.info('resource', `Resource request queued for ${entity.id}`, entity, {
          priority,
          requirements,
          queuePosition: this.requestQueue.size()
        }, time);
      }

      return {
        success: false,
        request,
        message: 'Resource request queued',
        queuePosition: this.requestQueue.size()
      };
    }
  }

  /**
   * Try to fulfill a resource request
   * @param {Object} request - Resource request
   * @param {boolean} isEmergency - Whether this is an emergency request
   * @returns {Object} - Result of the attempt
   */
  tryFulfillRequest(request, isEmergency) {
    const { entity, requirements } = request;
    const allocatedResources = [];
    let allResourcesAvailable = true;

    // Check each required resource type
    for (const [resourceType, amount] of Object.entries(requirements)) {
      if (amount <= 0) continue;

      // Get available resources of this type
      let availableResources = this.getAvailableResources(resourceType, amount, isEmergency);

      if (availableResources.length < amount) {
        allResourcesAvailable = false;
        break;
      }

      // Mark these resources for allocation
      for (let i = 0; i < amount; i++) {
        allocatedResources.push(availableResources[i]);
      }
    }

    // If all resources are available, allocate them
    if (allResourcesAvailable) {
      for (const resource of allocatedResources) {
        this.allocateResource(resource.id, entity, 1, request.time);
        request.allocatedResources.push(resource.id);
      }

      return {
        fulfilled: true,
        allocatedResources: request.allocatedResources
      };
    }

    return {
      fulfilled: false,
      message: 'Not all required resources are available'
    };
  }

  /**
   * Get available resources of a specific type
   * @param {string} resourceType - Type of resource
   * @param {number} amount - Amount needed
   * @param {boolean} isEmergency - Whether this is an emergency request
   * @returns {Array} - Array of available resources
   */
  getAvailableResources(resourceType, amount, isEmergency) {
    let resources = [];

    // Handle different resource types
    if (resourceType === 'doctors' || resourceType === 'doctor') {
      resources = this.getResourcesByType('staff')
        .filter(r => r.subtype === 'doctor' && r.available > 0);
    } else if (resourceType === 'nurses' || resourceType === 'nurse') {
      resources = this.getResourcesByType('staff')
        .filter(r => r.subtype === 'nurse' && r.available > 0);
    } else if (resourceType === 'beds' || resourceType === 'bed') {
      resources = this.getResourcesByType('physical')
        .filter(r => r.subtype === 'bed' && r.available > 0);
    } else if (resourceType === 'rooms' || resourceType === 'room') {
      resources = this.getResourcesByType('physical')
        .filter(r => r.subtype === 'room' && r.available > 0);
    } else if (resourceType === 'ventilators' || resourceType === 'ventilator') {
      resources = this.getResourcesByType('equipment')
        .filter(r => r.subtype === 'ventilator' && r.available > 0);
    } else {
      // Generic equipment
      resources = this.getResourcesByType('equipment')
        .filter(r => r.subtype === resourceType && r.available > 0);
    }

    // If this is an emergency request, include reserved resources
    if (isEmergency) {
      // No filtering needed, all resources are available for emergencies
    } else {
      // Filter out resources reserved for emergencies
      resources = resources.filter(r => !r.isReservedForEmergency);
    }

    // Sort resources by priority (e.g., skill level, condition)
    resources.sort((a, b) => {
      // Prioritize resources with higher efficiency/condition
      if (a.efficiency && b.efficiency) {
        return b.efficiency - a.efficiency;
      } else if (a.condition && b.condition) {
        return b.condition - a.condition;
      }
      return 0;
    });

    return resources.slice(0, amount);
  }

  /**
   * Process the resource request queue
   * @param {number} time - Current simulation time
   * @returns {number} - Number of requests processed
   */
  processRequestQueue(time) {
    if (this.requestQueue.isEmpty()) {
      return 0;
    }

    let processedCount = 0;
    const queueSize = this.requestQueue.size();

    // Process up to 10 requests at a time
    for (let i = 0; i < Math.min(10, queueSize); i++) {
      if (this.requestQueue.isEmpty()) break;

      const request = this.requestQueue.dequeue();

      // Check if the request is still valid
      if (request.entity.status === 'discharged' || request.entity.status === 'transferred') {
        continue;
      }

      // Try to fulfill the request
      const isEmergency = request.priority >= 80;
      const result = this.tryFulfillRequest(request, isEmergency);

      if (result.fulfilled) {
        request.status = 'fulfilled';
        processedCount++;

        if (this.logger) {
          this.logger.info('resource', `Queued resource request fulfilled for ${request.entity.id}`, request.entity, {
            priority: request.priority,
            requirements: request.requirements,
            allocatedResources: request.allocatedResources,
            waitTime: time - request.time
          }, time);
        }
      } else {
        // Put back in the queue with slightly increased priority
        request.priority = Math.min(100, request.priority + 1);
        this.requestQueue.enqueue(request, -request.priority);
      }
    }

    return processedCount;
  }

  /**
   * Release all resources allocated to an entity
   * @param {Object} entity - Entity to release resources from
   * @param {number} time - Current simulation time
   * @returns {Array} - Array of released resource IDs
   */
  releaseAllResources(entity, time) {
    const releasedResources = [];

    // Find all resources allocated to this entity
    for (const resource of this.getAllResources()) {
      if (resource.assignments && resource.assignments.has(entity.id)) {
        this.releaseResource(resource.id, entity, time);
        releasedResources.push(resource.id);
      }
    }

    if (this.logger && releasedResources.length > 0) {
      this.logger.info('resource', `Released all resources for ${entity.id}`, entity, {
        releasedResources
      }, time);
    }

    return releasedResources;
  }
}

// Export the HospitalResourceManager class
export default HospitalResourceManager;
