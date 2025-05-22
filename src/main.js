import ERFlowUI from './ui/ERFlowUI.js';
import QueueUI from './ui/QueueUI.js';

/**
 * Main application class
 * Initializes and manages the application
 */
class App {
  /**
   * Constructor for the App class
   */
  constructor() {
    this.erFlowUI = new ERFlowUI();
    this.queueUI = new QueueUI();
  }

  /**
   * Initialize the application
   */
  initialize() {
    // Set up main tab switching
    this.setupMainTabSwitching();
    
    // Initialize UI controllers
    this.erFlowUI.initialize();
    this.queueUI.initialize();
  }

  /**
   * Set up main tab switching functionality
   */
  setupMainTabSwitching() {
    const mainTabs = document.querySelectorAll('.main-tab');
    const mainTabContents = document.querySelectorAll('.main-tab-content');

    mainTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-main-tab');

        mainTabs.forEach(t => t.classList.remove('active'));
        mainTabContents.forEach(tc => tc.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tabId).classList.add('active');
      });
    });
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.initialize();
});
