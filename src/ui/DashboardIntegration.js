/**
 * DashboardIntegration.js
 * Integrates the analytics dashboard with the simulation
 */

import AnalyticsDashboard from './AnalyticsDashboard.js';

/**
 * Dashboard Integration class
 * Provides integration between the simulation and the analytics dashboard
 */
class DashboardIntegration {
  /**
   * Constructor for the DashboardIntegration class
   * @param {Object} simulator - Simulator instance
   * @param {HTMLElement} container - Container element for the dashboard
   * @param {Object} options - Integration options
   */
  constructor(simulator, container, options = {}) {
    this.simulator = simulator;
    this.container = container;
    this.options = {
      darkMode: options.darkMode || false,
      showPredictions: options.showPredictions !== false,
      refreshInterval: options.refreshInterval || 1000,
      ...options
    };
    
    this.dashboard = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the integration
   */
  initialize() {
    // Create dashboard
    this.dashboard = new AnalyticsDashboard(this.simulator, this.container, this.options);
    
    // Initialize dashboard
    this.dashboard.initialize();
    
    // Register event handlers
    this.registerEventHandlers();
    
    this.initialized = true;
  }
  
  /**
   * Register event handlers
   */
  registerEventHandlers() {
    // Add window resize handler
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Add simulator event handlers if needed
    if (this.simulator && this.simulator.on) {
      this.simulator.on('simulationStart', this.handleSimulationStart.bind(this));
      this.simulator.on('simulationEnd', this.handleSimulationEnd.bind(this));
      this.simulator.on('simulationPause', this.handleSimulationPause.bind(this));
      this.simulator.on('simulationResume', this.handleSimulationResume.bind(this));
    }
  }
  
  /**
   * Handle window resize event
   */
  handleResize() {
    // Destroy and recreate dashboard to update canvas sizes
    if (this.initialized && this.dashboard) {
      this.dashboard.destroy();
      this.dashboard.initialize();
    }
  }
  
  /**
   * Handle simulation start event
   * @param {Object} event - Event data
   */
  handleSimulationStart(event) {
    console.log('Simulation started, updating dashboard...');
    
    // Reset dashboard data
    if (this.dashboard) {
      this.dashboard.data = {
        patientFlow: [],
        waitTimes: [],
        resourceUtilization: new Map(),
        patientOutcomes: [],
        predictions: {
          patientFlow: [],
          waitTimes: [],
          resourceUtilization: new Map(),
          patientOutcomes: []
        }
      };
      
      // Refresh dashboard
      this.dashboard.refreshDashboard();
    }
  }
  
  /**
   * Handle simulation end event
   * @param {Object} event - Event data
   */
  handleSimulationEnd(event) {
    console.log('Simulation ended, finalizing dashboard...');
    
    // Final dashboard refresh
    if (this.dashboard) {
      this.dashboard.refreshDashboard();
    }
  }
  
  /**
   * Handle simulation pause event
   * @param {Object} event - Event data
   */
  handleSimulationPause(event) {
    console.log('Simulation paused, updating dashboard...');
    
    // Refresh dashboard
    if (this.dashboard) {
      this.dashboard.refreshDashboard();
    }
  }
  
  /**
   * Handle simulation resume event
   * @param {Object} event - Event data
   */
  handleSimulationResume(event) {
    console.log('Simulation resumed, updating dashboard...');
    
    // Refresh dashboard
    if (this.dashboard) {
      this.dashboard.refreshDashboard();
    }
  }
  
  /**
   * Show the dashboard
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
    
    // Refresh dashboard
    if (this.dashboard) {
      this.dashboard.refreshDashboard();
    }
  }
  
  /**
   * Hide the dashboard
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
  
  /**
   * Toggle dashboard visibility
   * @returns {boolean} - New visibility state
   */
  toggle() {
    if (this.container) {
      const isVisible = this.container.style.display !== 'none';
      this.container.style.display = isVisible ? 'none' : 'block';
      
      // Refresh dashboard if showing
      if (!isVisible && this.dashboard) {
        this.dashboard.refreshDashboard();
      }
      
      return !isVisible;
    }
    
    return false;
  }
  
  /**
   * Set dashboard options
   * @param {Object} options - Dashboard options
   */
  setOptions(options) {
    this.options = {
      ...this.options,
      ...options
    };
    
    // Update dashboard options
    if (this.dashboard) {
      this.dashboard.options = {
        ...this.dashboard.options,
        ...options
      };
      
      // Refresh dashboard
      this.dashboard.refreshDashboard();
    }
  }
  
  /**
   * Toggle predictions visibility
   * @returns {boolean} - New predictions visibility state
   */
  togglePredictions() {
    const showPredictions = !this.options.showPredictions;
    
    this.options.showPredictions = showPredictions;
    
    // Update dashboard options
    if (this.dashboard) {
      this.dashboard.options.showPredictions = showPredictions;
      
      // Refresh dashboard
      this.dashboard.refreshDashboard();
    }
    
    return showPredictions;
  }
  
  /**
   * Toggle dark mode
   * @returns {boolean} - New dark mode state
   */
  toggleDarkMode() {
    const darkMode = !this.options.darkMode;
    
    this.options.darkMode = darkMode;
    
    // Recreate dashboard with new options
    if (this.initialized && this.dashboard) {
      this.dashboard.destroy();
      
      this.dashboard = new AnalyticsDashboard(this.simulator, this.container, {
        ...this.options,
        darkMode
      });
      
      this.dashboard.initialize();
    }
    
    return darkMode;
  }
  
  /**
   * Destroy the integration
   */
  destroy() {
    // Remove event handlers
    window.removeEventListener('resize', this.handleResize);
    
    if (this.simulator && this.simulator.off) {
      this.simulator.off('simulationStart', this.handleSimulationStart);
      this.simulator.off('simulationEnd', this.handleSimulationEnd);
      this.simulator.off('simulationPause', this.handleSimulationPause);
      this.simulator.off('simulationResume', this.handleSimulationResume);
    }
    
    // Destroy dashboard
    if (this.dashboard) {
      this.dashboard.destroy();
      this.dashboard = null;
    }
    
    this.initialized = false;
  }
}

// Export the class
export default DashboardIntegration;
