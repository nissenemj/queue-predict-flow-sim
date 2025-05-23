/**
 * SimulationVisualizer.js
 * Main visualization component for the hospital simulation
 */

import PatientFlowVisualizer from './PatientFlowVisualizer.js';
import ResourceVisualizer from './ResourceVisualizer.js';
import TimelineControl from './TimelineControl.js';

/**
 * Simulation Visualizer class
 * Provides a comprehensive visualization of the hospital simulation
 */
class SimulationVisualizer {
  /**
   * Constructor for the SimulationVisualizer class
   * @param {Object} simulator - Simulator instance
   * @param {HTMLElement} container - Container element for the visualization
   * @param {Object} options - Visualization options
   */
  constructor(simulator, container, options = {}) {
    this.simulator = simulator;
    this.container = container;
    this.options = {
      darkMode: options.darkMode || false,
      showPatientFlow: options.showPatientFlow !== false,
      showResources: options.showResources !== false,
      showTimeline: options.showTimeline !== false,
      animationSpeed: options.animationSpeed || 1,
      ...options
    };
    
    // Visualization components
    this.components = {
      patientFlow: null,
      resources: null,
      timeline: null
    };
    
    // Component containers
    this.containers = {
      patientFlow: null,
      resources: null,
      timeline: null
    };
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the visualizer
   */
  initialize() {
    // Create layout
    this.createLayout();
    
    // Create visualization components
    this.createComponents();
    
    // Register event handlers
    this.registerEventHandlers();
    
    // Add window resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Create layout
   */
  createLayout() {
    // Clear container
    this.container.innerHTML = '';
    
    // Set container style
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';
    this.container.style.backgroundColor = this.options.darkMode ? '#222' : '#f5f5f5';
    this.container.style.color = this.options.darkMode ? '#fff' : '#333';
    
    // Create patient flow container
    if (this.options.showPatientFlow) {
      const patientFlowContainer = document.createElement('div');
      patientFlowContainer.style.flex = '2';
      patientFlowContainer.style.minHeight = '300px';
      patientFlowContainer.style.padding = '10px';
      patientFlowContainer.style.boxSizing = 'border-box';
      
      // Add title
      const patientFlowTitle = document.createElement('h2');
      patientFlowTitle.textContent = 'Patient Flow';
      patientFlowTitle.style.margin = '0 0 10px 0';
      patientFlowTitle.style.fontSize = '18px';
      patientFlowTitle.style.textAlign = 'center';
      
      patientFlowContainer.appendChild(patientFlowTitle);
      
      // Create content container
      const patientFlowContent = document.createElement('div');
      patientFlowContent.style.width = '100%';
      patientFlowContent.style.height = 'calc(100% - 30px)';
      
      patientFlowContainer.appendChild(patientFlowContent);
      this.container.appendChild(patientFlowContainer);
      
      this.containers.patientFlow = patientFlowContent;
    }
    
    // Create resources container
    if (this.options.showResources) {
      const resourcesContainer = document.createElement('div');
      resourcesContainer.style.flex = '1';
      resourcesContainer.style.minHeight = '200px';
      resourcesContainer.style.padding = '10px';
      resourcesContainer.style.boxSizing = 'border-box';
      
      // Add title
      const resourcesTitle = document.createElement('h2');
      resourcesTitle.textContent = 'Resource Utilization';
      resourcesTitle.style.margin = '0 0 10px 0';
      resourcesTitle.style.fontSize = '18px';
      resourcesTitle.style.textAlign = 'center';
      
      resourcesContainer.appendChild(resourcesTitle);
      
      // Create content container
      const resourcesContent = document.createElement('div');
      resourcesContent.style.width = '100%';
      resourcesContent.style.height = 'calc(100% - 30px)';
      
      resourcesContainer.appendChild(resourcesContent);
      this.container.appendChild(resourcesContainer);
      
      this.containers.resources = resourcesContent;
    }
    
    // Create timeline container
    if (this.options.showTimeline) {
      const timelineContainer = document.createElement('div');
      timelineContainer.style.height = '120px';
      timelineContainer.style.padding = '10px';
      timelineContainer.style.boxSizing = 'border-box';
      timelineContainer.style.borderTop = this.options.darkMode ? '1px solid #444' : '1px solid #ddd';
      
      this.container.appendChild(timelineContainer);
      
      this.containers.timeline = timelineContainer;
    }
  }
  
  /**
   * Create visualization components
   */
  createComponents() {
    // Create patient flow visualizer
    if (this.containers.patientFlow) {
      this.components.patientFlow = new PatientFlowVisualizer(
        this.simulator,
        this.containers.patientFlow,
        {
          darkMode: this.options.darkMode,
          animationSpeed: this.options.animationSpeed,
          width: this.containers.patientFlow.clientWidth,
          height: this.containers.patientFlow.clientHeight
        }
      );
    }
    
    // Create resource visualizer
    if (this.containers.resources) {
      this.components.resources = new ResourceVisualizer(
        this.simulator,
        this.containers.resources,
        {
          darkMode: this.options.darkMode,
          animationSpeed: this.options.animationSpeed,
          width: this.containers.resources.clientWidth,
          height: this.containers.resources.clientHeight
        }
      );
    }
    
    // Create timeline control
    if (this.containers.timeline) {
      this.components.timeline = new TimelineControl(
        this.simulator,
        this.containers.timeline,
        {
          darkMode: this.options.darkMode,
          defaultSpeed: this.options.animationSpeed
        }
      );
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
    this.simulator.on('simulationStart', this.handleSimulationStart.bind(this));
    this.simulator.on('simulationEnd', this.handleSimulationEnd.bind(this));
  }
  
  /**
   * Handle simulation start event
   * @param {Object} event - Event data
   */
  handleSimulationStart(event) {
    console.log('Simulation started, updating visualization...');
  }
  
  /**
   * Handle simulation end event
   * @param {Object} event - Event data
   */
  handleSimulationEnd(event) {
    console.log('Simulation ended, finalizing visualization...');
  }
  
  /**
   * Handle window resize event
   */
  handleResize() {
    // Resize patient flow visualizer
    if (this.components.patientFlow && this.containers.patientFlow) {
      this.components.patientFlow.resize(
        this.containers.patientFlow.clientWidth,
        this.containers.patientFlow.clientHeight
      );
    }
    
    // Resize resource visualizer
    if (this.components.resources && this.containers.resources) {
      this.components.resources.resize(
        this.containers.resources.clientWidth,
        this.containers.resources.clientHeight
      );
    }
  }
  
  /**
   * Set animation speed
   * @param {number} speed - Animation speed
   */
  setAnimationSpeed(speed) {
    this.options.animationSpeed = speed;
    
    // Update component speeds
    if (this.components.patientFlow) {
      this.components.patientFlow.options.animationSpeed = speed;
    }
    
    if (this.components.resources) {
      this.components.resources.options.animationSpeed = speed;
    }
  }
  
  /**
   * Set dark mode
   * @param {boolean} darkMode - Dark mode enabled
   */
  setDarkMode(darkMode) {
    this.options.darkMode = darkMode;
    
    // Update container style
    this.container.style.backgroundColor = darkMode ? '#222' : '#f5f5f5';
    this.container.style.color = darkMode ? '#fff' : '#333';
    
    // Update timeline container border
    if (this.containers.timeline) {
      this.containers.timeline.style.borderTop = darkMode ? '1px solid #444' : '1px solid #ddd';
    }
    
    // Update component dark mode
    if (this.components.patientFlow) {
      this.components.patientFlow.setDarkMode(darkMode);
    }
    
    if (this.components.resources) {
      this.components.resources.setDarkMode(darkMode);
    }
    
    if (this.components.timeline) {
      this.components.timeline.setDarkMode(darkMode);
    }
  }
  
  /**
   * Destroy the visualizer
   */
  destroy() {
    // Remove window resize handler
    window.removeEventListener('resize', this.handleResize);
    
    // Remove event handlers
    if (this.simulator && this.simulator.off) {
      this.simulator.off('simulationStart', this.handleSimulationStart);
      this.simulator.off('simulationEnd', this.handleSimulationEnd);
    }
    
    // Destroy components
    if (this.components.patientFlow) {
      this.components.patientFlow.destroy();
    }
    
    if (this.components.resources) {
      this.components.resources.destroy();
    }
    
    if (this.components.timeline) {
      this.components.timeline.destroy();
    }
    
    // Clear container
    this.container.innerHTML = '';
  }
}

// Export the class
export default SimulationVisualizer;
