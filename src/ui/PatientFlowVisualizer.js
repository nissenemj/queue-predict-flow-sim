/**
 * PatientFlowVisualizer.js
 * Visualizes patient flow through the hospital in real-time
 */

/**
 * Patient Flow Visualizer class
 * Provides real-time visualization of patient flow through the hospital
 */
class PatientFlowVisualizer {
  /**
   * Constructor for the PatientFlowVisualizer class
   * @param {Object} simulator - Simulator instance
   * @param {HTMLElement} container - Container element for the visualization
   * @param {Object} options - Visualization options
   */
  constructor(simulator, container, options = {}) {
    this.simulator = simulator;
    this.container = container;
    this.options = {
      width: options.width || 800,
      height: options.height || 600,
      animationSpeed: options.animationSpeed || 1,
      showLabels: options.showLabels !== false,
      darkMode: options.darkMode || false,
      patientRadius: options.patientRadius || 5,
      departmentPadding: options.departmentPadding || 10,
      ...options
    };
    
    // Canvas and context
    this.canvas = null;
    this.ctx = null;
    
    // Departments and their positions
    this.departments = [
      { id: 'entrance', name: 'Entrance', x: 50, y: 300, width: 100, height: 50, color: '#4285F4' },
      { id: 'triage', name: 'Triage', x: 200, y: 300, width: 100, height: 50, color: '#FBBC05' },
      { id: 'waiting', name: 'Waiting Room', x: 200, y: 400, width: 150, height: 100, color: '#34A853' },
      { id: 'ed', name: 'Emergency Department', x: 350, y: 200, width: 200, height: 150, color: '#EA4335' },
      { id: 'imaging', name: 'Imaging', x: 350, y: 400, width: 150, height: 80, color: '#8AB4F8' },
      { id: 'lab', name: 'Laboratory', x: 550, y: 400, width: 150, height: 80, color: '#F6AEA9' },
      { id: 'icu', name: 'ICU', x: 600, y: 200, width: 150, height: 100, color: '#FDE293' },
      { id: 'ward', name: 'Ward', x: 600, y: 50, width: 150, height: 100, color: '#A8DAB5' },
      { id: 'discharge', name: 'Discharge', x: 350, y: 50, width: 100, height: 50, color: '#4285F4' }
    ];
    
    // Paths between departments
    this.paths = [
      { from: 'entrance', to: 'triage', points: [] },
      { from: 'triage', to: 'waiting', points: [] },
      { from: 'waiting', to: 'ed', points: [] },
      { from: 'triage', to: 'ed', points: [] },
      { from: 'ed', to: 'imaging', points: [] },
      { from: 'ed', to: 'lab', points: [] },
      { from: 'ed', to: 'icu', points: [] },
      { from: 'ed', to: 'ward', points: [] },
      { from: 'ed', to: 'discharge', points: [] },
      { from: 'icu', to: 'ward', points: [] },
      { from: 'icu', to: 'discharge', points: [] },
      { from: 'ward', to: 'discharge', points: [] }
    ];
    
    // Patients and their positions
    this.patients = new Map();
    
    // Animation frame ID
    this.animationFrameId = null;
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the visualizer
   */
  initialize() {
    // Create canvas
    this.createCanvas();
    
    // Calculate path points
    this.calculatePaths();
    
    // Register event handlers
    this.registerEventHandlers();
    
    // Start animation loop
    this.startAnimation();
  }
  
  /**
   * Create canvas
   */
  createCanvas() {
    // Clear container
    this.container.innerHTML = '';
    
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    
    // Get context
    this.ctx = this.canvas.getContext('2d');
    
    // Add canvas to container
    this.container.appendChild(this.canvas);
  }
  
  /**
   * Calculate paths between departments
   */
  calculatePaths() {
    for (const path of this.paths) {
      const fromDept = this.departments.find(d => d.id === path.from);
      const toDept = this.departments.find(d => d.id === path.to);
      
      if (fromDept && toDept) {
        // Calculate center points
        const fromX = fromDept.x + fromDept.width / 2;
        const fromY = fromDept.y + fromDept.height / 2;
        const toX = toDept.x + toDept.width / 2;
        const toY = toDept.y + toDept.height / 2;
        
        // Create path points
        path.points = [
          { x: fromX, y: fromY },
          { x: toX, y: toY }
        ];
        
        // Add intermediate points for complex paths
        if (Math.abs(fromX - toX) > 200 || Math.abs(fromY - toY) > 200) {
          // Add a midpoint
          path.points = [
            { x: fromX, y: fromY },
            { x: (fromX + toX) / 2, y: (fromY + toY) / 2 },
            { x: toX, y: toY }
          ];
        }
      }
    }
  }
  
  /**
   * Register event handlers
   */
  registerEventHandlers() {
    if (!this.simulator || !this.simulator.on) {
      console.warn('Simulator does not support event handlers');
      return;
    }
    
    // Register for simulator events
    this.simulator.on('patientArrival', this.handlePatientArrival.bind(this));
    this.simulator.on('patientTransfer', this.handlePatientTransfer.bind(this));
    this.simulator.on('patientDischarge', this.handlePatientDischarge.bind(this));
    this.simulator.on('simulationStep', this.handleSimulationStep.bind(this));
  }
  
  /**
   * Handle patient arrival event
   * @param {Object} event - Event data
   */
  handlePatientArrival(event) {
    const { patient, time } = event;
    
    // Add patient to visualization
    this.addPatient(patient, 'entrance');
  }
  
  /**
   * Handle patient transfer event
   * @param {Object} event - Event data
   */
  handlePatientTransfer(event) {
    const { patient, fromLocation, toLocation, time } = event;
    
    // Map location to department
    const toDept = this.mapLocationToDepartment(toLocation);
    
    // Move patient to new department
    this.movePatient(patient, toDept);
  }
  
  /**
   * Handle patient discharge event
   * @param {Object} event - Event data
   */
  handlePatientDischarge(event) {
    const { patient, time } = event;
    
    // Move patient to discharge
    this.movePatient(patient, 'discharge');
    
    // Remove patient after animation completes
    setTimeout(() => {
      this.removePatient(patient);
    }, 2000);
  }
  
  /**
   * Handle simulation step event
   * @param {Object} event - Event data
   */
  handleSimulationStep(event) {
    // Update patient positions
    this.updatePatientPositions();
  }
  
  /**
   * Add a patient to the visualization
   * @param {Object} patient - Patient object
   * @param {string} departmentId - Department ID
   */
  addPatient(patient, departmentId) {
    const department = this.departments.find(d => d.id === departmentId);
    
    if (!department) return;
    
    // Create patient visualization data
    const patientData = {
      id: patient.id,
      acuityLevel: patient.acuityLevel,
      currentDepartment: departmentId,
      targetDepartment: departmentId,
      x: department.x + Math.random() * department.width,
      y: department.y + Math.random() * department.height,
      targetX: null,
      targetY: null,
      color: this.getPatientColor(patient.acuityLevel),
      path: null,
      pathIndex: 0,
      pathProgress: 0,
      isMoving: false
    };
    
    // Add to patients map
    this.patients.set(patient.id, patientData);
  }
  
  /**
   * Move a patient to a new department
   * @param {Object} patient - Patient object
   * @param {string} departmentId - Department ID
   */
  movePatient(patient, departmentId) {
    const patientData = this.patients.get(patient.id);
    const department = this.departments.find(d => d.id === departmentId);
    
    if (!patientData || !department) return;
    
    // Find path between departments
    const path = this.paths.find(p => 
      p.from === patientData.currentDepartment && p.to === departmentId
    );
    
    if (path) {
      // Set target department and path
      patientData.targetDepartment = departmentId;
      patientData.path = path;
      patientData.pathIndex = 0;
      patientData.pathProgress = 0;
      patientData.isMoving = true;
      
      // Set initial target position to first path point
      patientData.targetX = path.points[0].x;
      patientData.targetY = path.points[0].y;
    } else {
      // No path found, teleport to new department
      patientData.currentDepartment = departmentId;
      patientData.targetDepartment = departmentId;
      patientData.x = department.x + Math.random() * department.width;
      patientData.y = department.y + Math.random() * department.height;
      patientData.isMoving = false;
    }
  }
  
  /**
   * Remove a patient from the visualization
   * @param {Object} patient - Patient object
   */
  removePatient(patient) {
    this.patients.delete(patient.id);
  }
  
  /**
   * Update patient positions
   */
  updatePatientPositions() {
    const speed = 0.05 * this.options.animationSpeed;
    
    for (const [id, patient] of this.patients.entries()) {
      if (patient.isMoving) {
        // Update path progress
        patient.pathProgress += speed;
        
        // Check if we've reached the next path point
        if (patient.pathProgress >= 1) {
          patient.pathIndex++;
          patient.pathProgress = 0;
          
          // Check if we've reached the end of the path
          if (patient.pathIndex >= patient.path.points.length - 1) {
            // Reached target department
            patient.currentDepartment = patient.targetDepartment;
            patient.isMoving = false;
            
            // Set position to random location within department
            const department = this.departments.find(d => d.id === patient.targetDepartment);
            if (department) {
              patient.x = department.x + Math.random() * department.width;
              patient.y = department.y + Math.random() * department.height;
            }
          } else {
            // Set next target position
            patient.targetX = patient.path.points[patient.pathIndex + 1].x;
            patient.targetY = patient.path.points[patient.pathIndex + 1].y;
          }
        } else {
          // Interpolate position along path
          const startX = patient.path.points[patient.pathIndex].x;
          const startY = patient.path.points[patient.pathIndex].y;
          const endX = patient.path.points[patient.pathIndex + 1].x;
          const endY = patient.path.points[patient.pathIndex + 1].y;
          
          patient.x = startX + (endX - startX) * patient.pathProgress;
          patient.y = startY + (endY - startY) * patient.pathProgress;
        }
      }
    }
  }
  
  /**
   * Start animation loop
   */
  startAnimation() {
    const animate = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  /**
   * Stop animation loop
   */
  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Render the visualization
   */
  render() {
    // Clear canvas
    this.ctx.fillStyle = this.options.darkMode ? '#222' : '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw paths
    this.drawPaths();
    
    // Draw departments
    this.drawDepartments();
    
    // Draw patients
    this.drawPatients();
  }
  
  /**
   * Draw paths between departments
   */
  drawPaths() {
    this.ctx.strokeStyle = this.options.darkMode ? '#444' : '#ddd';
    this.ctx.lineWidth = 2;
    
    for (const path of this.paths) {
      if (path.points.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(path.points[0].x, path.points[0].y);
        
        for (let i = 1; i < path.points.length; i++) {
          this.ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        
        this.ctx.stroke();
      }
    }
  }
  
  /**
   * Draw departments
   */
  drawDepartments() {
    for (const dept of this.departments) {
      // Draw department rectangle
      this.ctx.fillStyle = dept.color + (this.options.darkMode ? '80' : '40');
      this.ctx.strokeStyle = dept.color;
      this.ctx.lineWidth = 2;
      
      this.ctx.beginPath();
      this.ctx.rect(
        dept.x, 
        dept.y, 
        dept.width, 
        dept.height
      );
      this.ctx.fill();
      this.ctx.stroke();
      
      // Draw department name
      if (this.options.showLabels) {
        this.ctx.fillStyle = this.options.darkMode ? '#fff' : '#333';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
          dept.name, 
          dept.x + dept.width / 2, 
          dept.y + dept.height / 2
        );
      }
    }
  }
  
  /**
   * Draw patients
   */
  drawPatients() {
    for (const [id, patient] of this.patients.entries()) {
      // Draw patient circle
      this.ctx.fillStyle = patient.color;
      this.ctx.beginPath();
      this.ctx.arc(
        patient.x, 
        patient.y, 
        this.options.patientRadius, 
        0, 
        Math.PI * 2
      );
      this.ctx.fill();
      
      // Draw patient ID
      if (this.options.showLabels) {
        this.ctx.fillStyle = this.options.darkMode ? '#fff' : '#333';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
          id.toString(), 
          patient.x, 
          patient.y - this.options.patientRadius - 5
        );
      }
    }
  }
  
  /**
   * Get patient color based on acuity level
   * @param {number} acuityLevel - Patient acuity level (1-5)
   * @returns {string} - Color string
   */
  getPatientColor(acuityLevel) {
    const colors = {
      1: '#EA4335', // Critical (red)
      2: '#FBBC05', // Severe (yellow)
      3: '#34A853', // Moderate (green)
      4: '#4285F4', // Mild (blue)
      5: '#8AB4F8'  // Minor (light blue)
    };
    
    return colors[acuityLevel] || '#4285F4';
  }
  
  /**
   * Map location string to department ID
   * @param {string} location - Location string
   * @returns {string} - Department ID
   */
  mapLocationToDepartment(location) {
    const mapping = {
      'entrance': 'entrance',
      'triage': 'triage',
      'waiting_room': 'waiting',
      'ed': 'ed',
      'emergency': 'ed',
      'emergency_department': 'ed',
      'imaging': 'imaging',
      'radiology': 'imaging',
      'lab': 'lab',
      'laboratory': 'lab',
      'icu': 'icu',
      'intensive_care': 'icu',
      'ward': 'ward',
      'inpatient': 'ward',
      'discharge': 'discharge',
      'exit': 'discharge'
    };
    
    return mapping[location.toLowerCase()] || 'waiting';
  }
  
  /**
   * Resize the visualization
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this.options.width = width;
    this.options.height = height;
    
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
  
  /**
   * Set dark mode
   * @param {boolean} darkMode - Dark mode enabled
   */
  setDarkMode(darkMode) {
    this.options.darkMode = darkMode;
  }
  
  /**
   * Destroy the visualizer
   */
  destroy() {
    // Stop animation
    this.stopAnimation();
    
    // Remove event handlers
    if (this.simulator && this.simulator.off) {
      this.simulator.off('patientArrival', this.handlePatientArrival);
      this.simulator.off('patientTransfer', this.handlePatientTransfer);
      this.simulator.off('patientDischarge', this.handlePatientDischarge);
      this.simulator.off('simulationStep', this.handleSimulationStep);
    }
    
    // Clear container
    this.container.innerHTML = '';
  }
}

// Export the class
export default PatientFlowVisualizer;
