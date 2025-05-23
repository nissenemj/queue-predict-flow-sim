/**
 * DepartmentManager.js
 * Manages hospital departments and patient transfers
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import Logger from '../utils/Logger.js';

/**
 * Department Manager class
 * Manages hospital departments and patient transfers
 */
class DepartmentManager extends EventEmitter {
  /**
   * Constructor for the DepartmentManager class
   * @param {Object} options - Manager options
   */
  constructor(options = {}) {
    super();
    
    this.departments = new Map();
    this.transferQueue = [];
    this.options = {
      debug: options.debug || false,
      ...options
    };
    
    // Logger
    this.logger = options.logger || new Logger({ level: 'info' });
    
    // Statistics
    this.stats = {
      totalPatients: 0,
      currentPatients: 0,
      transfersRequested: 0,
      transfersCompleted: 0,
      transfersFailed: 0,
      avgTransferWaitTime: 0
    };
  }
  
  /**
   * Register a department
   * @param {Object} department - Department to register
   */
  registerDepartment(department) {
    if (!department || !department.id) {
      this.logger.error('department_manager', 'Invalid department');
      return;
    }
    
    // Check if department is already registered
    if (this.departments.has(department.id)) {
      this.logger.warn('department_manager', `Department ${department.id} is already registered`);
      return;
    }
    
    // Register department
    this.departments.set(department.id, department);
    
    // Register event handlers
    department.on('transferRequest', this.handleTransferRequest.bind(this));
    department.on('patientAdmitted', this.handlePatientAdmitted.bind(this));
    department.on('patientDischarged', this.handlePatientDischarged.bind(this));
    department.on('patientTransferred', this.handlePatientTransferred.bind(this));
    
    this.logger.info('department_manager', `Department ${department.id} registered`, null, {
      departmentId: department.id,
      departmentName: department.name,
      departmentType: department.type
    });
  }
  
  /**
   * Unregister a department
   * @param {string} departmentId - Department ID
   */
  unregisterDepartment(departmentId) {
    if (!this.departments.has(departmentId)) {
      this.logger.warn('department_manager', `Department ${departmentId} is not registered`);
      return;
    }
    
    const department = this.departments.get(departmentId);
    
    // Unregister event handlers
    department.off('transferRequest', this.handleTransferRequest);
    department.off('patientAdmitted', this.handlePatientAdmitted);
    department.off('patientDischarged', this.handlePatientDischarged);
    department.off('patientTransferred', this.handlePatientTransferred);
    
    // Unregister department
    this.departments.delete(departmentId);
    
    this.logger.info('department_manager', `Department ${departmentId} unregistered`);
  }
  
  /**
   * Get a department by ID
   * @param {string} departmentId - Department ID
   * @returns {Object|null} - Department or null if not found
   */
  getDepartment(departmentId) {
    return this.departments.get(departmentId) || null;
  }
  
  /**
   * Get all departments
   * @returns {Array} - Array of departments
   */
  getAllDepartments() {
    return Array.from(this.departments.values());
  }
  
  /**
   * Get departments by type
   * @param {string} type - Department type
   * @returns {Array} - Array of departments of the specified type
   */
  getDepartmentsByType(type) {
    return Array.from(this.departments.values()).filter(dept => dept.type === type);
  }
  
  /**
   * Handle transfer request event
   * @param {Object} event - Event data
   */
  handleTransferRequest(event) {
    const { patient, fromDepartment, toDepartmentId, time } = event;
    
    // Check if target department exists
    const toDepartment = this.getDepartment(toDepartmentId);
    
    if (!toDepartment) {
      this.logger.error('department_manager', `Target department ${toDepartmentId} not found for transfer request`, patient, {
        fromDepartmentId: fromDepartment.id,
        toDepartmentId
      });
      
      // Emit transfer failed event
      this.emit('transferFailed', {
        patient,
        fromDepartment,
        toDepartmentId,
        reason: 'department_not_found',
        time
      });
      
      // Update stats
      this.stats.transfersRequested++;
      this.stats.transfersFailed++;
      
      return;
    }
    
    // Add to transfer queue
    this.transferQueue.push({
      patient,
      fromDepartment,
      toDepartment,
      requestTime: time,
      priority: this.calculateTransferPriority(patient, fromDepartment, toDepartment)
    });
    
    // Sort transfer queue by priority
    this.sortTransferQueue();
    
    // Update stats
    this.stats.transfersRequested++;
    
    this.logger.info('department_manager', `Transfer request added to queue for patient ${patient.id}`, patient, {
      fromDepartmentId: fromDepartment.id,
      toDepartmentId: toDepartment.id,
      queueLength: this.transferQueue.length
    });
    
    // Process transfer queue
    this.processTransferQueue(time);
  }
  
  /**
   * Handle patient admitted event
   * @param {Object} event - Event data
   */
  handlePatientAdmitted(event) {
    const { patient, department, time } = event;
    
    // Update stats
    this.stats.totalPatients++;
    this.stats.currentPatients++;
    
    // Emit event
    this.emit('patientAdmitted', {
      patient,
      department,
      time
    });
  }
  
  /**
   * Handle patient discharged event
   * @param {Object} event - Event data
   */
  handlePatientDischarged(event) {
    const { patient, department, time } = event;
    
    // Update stats
    this.stats.currentPatients--;
    
    // Emit event
    this.emit('patientDischarged', {
      patient,
      department,
      time
    });
  }
  
  /**
   * Handle patient transferred event
   * @param {Object} event - Event data
   */
  handlePatientTransferred(event) {
    const { patient, fromDepartment, toDepartment, time } = event;
    
    // Update stats
    this.stats.transfersCompleted++;
    
    // Emit event
    this.emit('patientTransferred', {
      patient,
      fromDepartment,
      toDepartment,
      time
    });
  }
  
  /**
   * Process transfer queue
   * @param {number} time - Current time
   */
  processTransferQueue(time) {
    // Check if there are transfers in the queue
    if (this.transferQueue.length === 0) {
      return;
    }
    
    // Get next transfer
    const nextTransfer = this.transferQueue[0];
    
    // Try to transfer patient
    const { patient, fromDepartment, toDepartment } = nextTransfer;
    
    // Check if target department has capacity
    if (toDepartment.isFull()) {
      this.logger.debug('department_manager', `Target department ${toDepartment.id} is full, waiting`, patient, {
        fromDepartmentId: fromDepartment.id,
        toDepartmentId: toDepartment.id
      });
      
      // Schedule retry
      setTimeout(() => {
        this.processTransferQueue(time + 15 * 60 * 1000); // Try again in 15 minutes
      }, 15 * 60 * 1000 / (this.options.speedFactor || 1)); // Adjust for simulation speed
      
      return;
    }
    
    // Transfer patient
    const transferred = fromDepartment.transferPatient(patient, toDepartment, {
      time,
      force: false
    });
    
    if (transferred) {
      // Remove from queue
      this.transferQueue.shift();
      
      // Calculate wait time
      const waitTime = (time - nextTransfer.requestTime) / (60 * 1000); // in minutes
      
      // Update stats
      this.stats.avgTransferWaitTime = (this.stats.avgTransferWaitTime * (this.stats.transfersCompleted - 1) + waitTime) / this.stats.transfersCompleted;
      
      this.logger.info('department_manager', `Patient ${patient.id} transferred from ${fromDepartment.id} to ${toDepartment.id}`, patient, {
        fromDepartmentId: fromDepartment.id,
        toDepartmentId: toDepartment.id,
        waitTime
      });
      
      // Process next transfer if any
      if (this.transferQueue.length > 0) {
        this.processTransferQueue(time);
      }
    } else {
      this.logger.warn('department_manager', `Transfer failed for patient ${patient.id}`, patient, {
        fromDepartmentId: fromDepartment.id,
        toDepartmentId: toDepartment.id
      });
      
      // Remove from queue
      this.transferQueue.shift();
      
      // Update stats
      this.stats.transfersFailed++;
      
      // Emit transfer failed event
      this.emit('transferFailed', {
        patient,
        fromDepartment,
        toDepartment,
        reason: 'transfer_failed',
        time
      });
      
      // Process next transfer if any
      if (this.transferQueue.length > 0) {
        this.processTransferQueue(time);
      }
    }
  }
  
  /**
   * Sort transfer queue by priority
   */
  sortTransferQueue() {
    this.transferQueue.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Calculate transfer priority
   * @param {Object} patient - Patient
   * @param {Object} fromDepartment - Source department
   * @param {Object} toDepartment - Target department
   * @returns {number} - Priority score
   */
  calculateTransferPriority(patient, fromDepartment, toDepartment) {
    // Base priority on acuity level (1-5, where 1 is most acute)
    let priority = 6 - patient.acuityLevel;
    
    // Adjust priority based on department types
    if (fromDepartment.type === 'emergency' && toDepartment.type === 'icu') {
      // High priority for ED to ICU transfers
      priority += 3;
    } else if (fromDepartment.type === 'icu' && toDepartment.type === 'ward') {
      // Medium priority for ICU to ward transfers
      priority += 1;
    } else if (fromDepartment.type === 'emergency' && toDepartment.type === 'ward') {
      // Medium priority for ED to ward transfers
      priority += 2;
    }
    
    // Adjust priority based on wait time
    const waitTime = (Date.now() - patient.admissionTime) / (60 * 60 * 1000); // in hours
    if (waitTime > 24) {
      priority += 3; // High priority for patients waiting > 24 hours
    } else if (waitTime > 12) {
      priority += 2; // Medium priority for patients waiting > 12 hours
    } else if (waitTime > 6) {
      priority += 1; // Low priority for patients waiting > 6 hours
    }
    
    return priority;
  }
  
  /**
   * Get manager statistics
   * @returns {Object} - Manager statistics
   */
  getStatistics() {
    // Collect department statistics
    const departmentStats = {};
    
    for (const [id, department] of this.departments.entries()) {
      departmentStats[id] = department.getStatistics();
    }
    
    return {
      ...this.stats,
      departments: departmentStats,
      transferQueueLength: this.transferQueue.length
    };
  }
  
  /**
   * Reset manager
   */
  reset() {
    // Reset all departments
    for (const [id, department] of this.departments.entries()) {
      department.reset();
    }
    
    // Clear transfer queue
    this.transferQueue = [];
    
    // Reset stats
    this.stats = {
      totalPatients: 0,
      currentPatients: 0,
      transfersRequested: 0,
      transfersCompleted: 0,
      transfersFailed: 0,
      avgTransferWaitTime: 0
    };
    
    this.logger.info('department_manager', 'Department manager reset');
  }
}

// Export the class
export default DepartmentManager;
