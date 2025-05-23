/**
 * ResourceVisualizer.js
 * Visualizes resource allocation and utilization in real-time
 */

/**
 * Resource Visualizer class
 * Provides real-time visualization of resource allocation and utilization
 */
class ResourceVisualizer {
  /**
   * Constructor for the ResourceVisualizer class
   * @param {Object} simulator - Simulator instance
   * @param {HTMLElement} container - Container element for the visualization
   * @param {Object} options - Visualization options
   */
  constructor(simulator, container, options = {}) {
    this.simulator = simulator;
    this.container = container;
    this.options = {
      width: options.width || 800,
      height: options.height || 400,
      darkMode: options.darkMode || false,
      showLabels: options.showLabels !== false,
      barHeight: options.barHeight || 30,
      barSpacing: options.barSpacing || 10,
      animationSpeed: options.animationSpeed || 0.1,
      ...options
    };
    
    // Canvas and context
    this.canvas = null;
    this.ctx = null;
    
    // Resource types and their data
    this.resourceTypes = [
      { id: 'doctors_day', name: 'Doctors (Day)', color: '#4285F4', capacity: 0, used: 0, targetUsed: 0 },
      { id: 'doctors_evening', name: 'Doctors (Evening)', color: '#4285F4', capacity: 0, used: 0, targetUsed: 0 },
      { id: 'doctors_night', name: 'Doctors (Night)', color: '#4285F4', capacity: 0, used: 0, targetUsed: 0 },
      { id: 'nurses_day', name: 'Nurses (Day)', color: '#34A853', capacity: 0, used: 0, targetUsed: 0 },
      { id: 'nurses_evening', name: 'Nurses (Evening)', color: '#34A853', capacity: 0, used: 0, targetUsed: 0 },
      { id: 'nurses_night', name: 'Nurses (Night)', color: '#34A853', capacity: 0, used: 0, targetUsed: 0 },
      { id: 'ed_beds', name: 'ED Beds', color: '#EA4335', capacity: 0, used: 0, targetUsed: 0 },
      { id: 'ward_beds', name: 'Ward Beds', color: '#FBBC05', capacity: 0, used: 0, targetUsed: 0 }
    ];
    
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
   * Register event handlers
   */
  registerEventHandlers() {
    if (!this.simulator || !this.simulator.on) {
      console.warn('Simulator does not support event handlers');
      return;
    }
    
    // Register for simulator events
    this.simulator.on('resourceAllocation', this.handleResourceAllocation.bind(this));
    this.simulator.on('resourceRelease', this.handleResourceRelease.bind(this));
    this.simulator.on('simulationStep', this.handleSimulationStep.bind(this));
    this.simulator.on('simulationStart', this.handleSimulationStart.bind(this));
  }
  
  /**
   * Handle resource allocation event
   * @param {Object} event - Event data
   */
  handleResourceAllocation(event) {
    const { resource, amount, time } = event;
    
    // Update resource usage
    this.updateResourceUsage(resource.id, amount, true);
  }
  
  /**
   * Handle resource release event
   * @param {Object} event - Event data
   */
  handleResourceRelease(event) {
    const { resource, amount, time } = event;
    
    // Update resource usage
    this.updateResourceUsage(resource.id, amount, false);
  }
  
  /**
   * Handle simulation step event
   * @param {Object} event - Event data
   */
  handleSimulationStep(event) {
    // Update resource data from simulator
    this.updateResourceData();
  }
  
  /**
   * Handle simulation start event
   * @param {Object} event - Event data
   */
  handleSimulationStart(event) {
    // Reset resource data
    for (const resource of this.resourceTypes) {
      resource.used = 0;
      resource.targetUsed = 0;
    }
    
    // Update resource data from simulator
    this.updateResourceData();
  }
  
  /**
   * Update resource usage
   * @param {string} resourceId - Resource ID
   * @param {number} amount - Amount to update
   * @param {boolean} isAllocation - Whether this is an allocation (true) or release (false)
   */
  updateResourceUsage(resourceId, amount, isAllocation) {
    const resource = this.resourceTypes.find(r => r.id === resourceId);
    
    if (resource) {
      if (isAllocation) {
        resource.targetUsed += amount;
      } else {
        resource.targetUsed -= amount;
      }
      
      // Ensure targetUsed is not negative
      resource.targetUsed = Math.max(0, resource.targetUsed);
    }
  }
  
  /**
   * Update resource data from simulator
   */
  updateResourceData() {
    if (!this.simulator || !this.simulator.resources) return;
    
    // Update resource capacities and usage
    for (const resource of this.resourceTypes) {
      const simResource = this.simulator.resources.getResource(resource.id);
      
      if (simResource) {
        resource.capacity = simResource.capacity || 0;
        resource.targetUsed = simResource.capacity - simResource.available;
      }
    }
  }
  
  /**
   * Start animation loop
   */
  startAnimation() {
    const animate = () => {
      this.updateAnimation();
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
   * Update animation
   */
  updateAnimation() {
    const speed = this.options.animationSpeed;
    
    // Animate resource usage
    for (const resource of this.resourceTypes) {
      if (resource.used !== resource.targetUsed) {
        if (resource.used < resource.targetUsed) {
          resource.used = Math.min(resource.targetUsed, resource.used + speed);
        } else {
          resource.used = Math.max(resource.targetUsed, resource.used - speed);
        }
      }
    }
  }
  
  /**
   * Render the visualization
   */
  render() {
    // Clear canvas
    this.ctx.fillStyle = this.options.darkMode ? '#222' : '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw resource bars
    this.drawResourceBars();
  }
  
  /**
   * Draw resource bars
   */
  drawResourceBars() {
    const { barHeight, barSpacing } = this.options;
    const totalBarHeight = barHeight + barSpacing;
    const startY = 50; // Start position for the first bar
    
    // Draw title
    this.ctx.fillStyle = this.options.darkMode ? '#fff' : '#333';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('Resource Utilization', this.canvas.width / 2, 10);
    
    // Draw each resource bar
    for (let i = 0; i < this.resourceTypes.length; i++) {
      const resource = this.resourceTypes[i];
      const y = startY + i * totalBarHeight;
      
      // Draw resource name
      this.ctx.fillStyle = this.options.darkMode ? '#fff' : '#333';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(resource.name, 10, y + barHeight / 2);
      
      // Calculate bar width
      const maxBarWidth = this.canvas.width - 200; // Leave space for text
      const barWidth = resource.capacity > 0 ? (resource.used / resource.capacity) * maxBarWidth : 0;
      
      // Draw background bar
      this.ctx.fillStyle = this.options.darkMode ? '#444' : '#eee';
      this.ctx.fillRect(150, y, maxBarWidth, barHeight);
      
      // Draw usage bar
      this.ctx.fillStyle = resource.color;
      this.ctx.fillRect(150, y, barWidth, barHeight);
      
      // Draw capacity marker
      this.ctx.strokeStyle = this.options.darkMode ? '#fff' : '#333';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(150 + maxBarWidth, y);
      this.ctx.lineTo(150 + maxBarWidth, y + barHeight);
      this.ctx.stroke();
      
      // Draw usage text
      this.ctx.fillStyle = this.options.darkMode ? '#fff' : '#333';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        `${Math.round(resource.used)} / ${resource.capacity}`, 
        160 + maxBarWidth, 
        y + barHeight / 2
      );
      
      // Draw utilization percentage
      const utilization = resource.capacity > 0 ? (resource.used / resource.capacity) * 100 : 0;
      this.ctx.fillText(
        `${Math.round(utilization)}%`, 
        150 + barWidth + 5, 
        y + barHeight / 2
      );
    }
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
      this.simulator.off('resourceAllocation', this.handleResourceAllocation);
      this.simulator.off('resourceRelease', this.handleResourceRelease);
      this.simulator.off('simulationStep', this.handleSimulationStep);
      this.simulator.off('simulationStart', this.handleSimulationStart);
    }
    
    // Clear container
    this.container.innerHTML = '';
  }
}

// Export the class
export default ResourceVisualizer;
