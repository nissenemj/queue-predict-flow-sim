/**
 * TimelineControl.js
 * Provides timeline controls for the simulation
 */

/**
 * Timeline Control class
 * Provides timeline controls for the simulation
 */
class TimelineControl {
  /**
   * Constructor for the TimelineControl class
   * @param {Object} simulator - Simulator instance
   * @param {HTMLElement} container - Container element for the control
   * @param {Object} options - Control options
   */
  constructor(simulator, container, options = {}) {
    this.simulator = simulator;
    this.container = container;
    this.options = {
      darkMode: options.darkMode || false,
      showTimeDisplay: options.showTimeDisplay !== false,
      showSpeedControl: options.showSpeedControl !== false,
      showPlaybackControls: options.showPlaybackControls !== false,
      minSpeed: options.minSpeed || 1,
      maxSpeed: options.maxSpeed || 100,
      defaultSpeed: options.defaultSpeed || 10,
      ...options
    };
    
    // Control elements
    this.elements = {
      timeDisplay: null,
      speedControl: null,
      playButton: null,
      pauseButton: null,
      stopButton: null,
      stepButton: null,
      slider: null
    };
    
    // Timeline state
    this.state = {
      isPlaying: false,
      speed: this.options.defaultSpeed,
      currentTime: 0,
      totalTime: 0,
      intervalId: null
    };
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the control
   */
  initialize() {
    // Create control elements
    this.createControlElements();
    
    // Register event handlers
    this.registerEventHandlers();
    
    // Update display
    this.updateDisplay();
  }
  
  /**
   * Create control elements
   */
  createControlElements() {
    // Clear container
    this.container.innerHTML = '';
    
    // Set container style
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.padding = '10px';
    this.container.style.backgroundColor = this.options.darkMode ? '#333' : '#f5f5f5';
    this.container.style.borderRadius = '5px';
    this.container.style.color = this.options.darkMode ? '#fff' : '#333';
    
    // Create time display
    if (this.options.showTimeDisplay) {
      const timeDisplayContainer = document.createElement('div');
      timeDisplayContainer.style.display = 'flex';
      timeDisplayContainer.style.justifyContent = 'space-between';
      timeDisplayContainer.style.alignItems = 'center';
      timeDisplayContainer.style.marginBottom = '10px';
      
      const timeLabel = document.createElement('span');
      timeLabel.textContent = 'Simulation Time:';
      timeLabel.style.fontWeight = 'bold';
      
      const timeDisplay = document.createElement('span');
      timeDisplay.id = 'time-display';
      timeDisplay.textContent = '00:00';
      timeDisplay.style.fontFamily = 'monospace';
      timeDisplay.style.fontSize = '16px';
      
      timeDisplayContainer.appendChild(timeLabel);
      timeDisplayContainer.appendChild(timeDisplay);
      
      this.container.appendChild(timeDisplayContainer);
      this.elements.timeDisplay = timeDisplay;
    }
    
    // Create timeline slider
    const sliderContainer = document.createElement('div');
    sliderContainer.style.marginBottom = '10px';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '0';
    slider.style.width = '100%';
    slider.style.height = '20px';
    
    sliderContainer.appendChild(slider);
    this.container.appendChild(sliderContainer);
    this.elements.slider = slider;
    
    // Create playback controls
    if (this.options.showPlaybackControls) {
      const controlsContainer = document.createElement('div');
      controlsContainer.style.display = 'flex';
      controlsContainer.style.justifyContent = 'center';
      controlsContainer.style.gap = '10px';
      controlsContainer.style.marginBottom = '10px';
      
      // Play button
      const playButton = this.createButton('Play', '▶️');
      controlsContainer.appendChild(playButton);
      this.elements.playButton = playButton;
      
      // Pause button
      const pauseButton = this.createButton('Pause', '⏸️');
      controlsContainer.appendChild(pauseButton);
      this.elements.pauseButton = pauseButton;
      
      // Stop button
      const stopButton = this.createButton('Stop', '⏹️');
      controlsContainer.appendChild(stopButton);
      this.elements.stopButton = stopButton;
      
      // Step button
      const stepButton = this.createButton('Step', '⏭️');
      controlsContainer.appendChild(stepButton);
      this.elements.stepButton = stepButton;
      
      this.container.appendChild(controlsContainer);
    }
    
    // Create speed control
    if (this.options.showSpeedControl) {
      const speedContainer = document.createElement('div');
      speedContainer.style.display = 'flex';
      speedContainer.style.alignItems = 'center';
      speedContainer.style.gap = '10px';
      
      const speedLabel = document.createElement('span');
      speedLabel.textContent = 'Speed:';
      speedLabel.style.fontWeight = 'bold';
      
      const speedControl = document.createElement('input');
      speedControl.type = 'range';
      speedControl.min = this.options.minSpeed.toString();
      speedControl.max = this.options.maxSpeed.toString();
      speedControl.value = this.options.defaultSpeed.toString();
      speedControl.style.flex = '1';
      
      const speedDisplay = document.createElement('span');
      speedDisplay.textContent = `${this.options.defaultSpeed}x`;
      speedDisplay.style.fontFamily = 'monospace';
      speedDisplay.style.minWidth = '40px';
      speedDisplay.style.textAlign = 'right';
      
      speedContainer.appendChild(speedLabel);
      speedContainer.appendChild(speedControl);
      speedContainer.appendChild(speedDisplay);
      
      this.container.appendChild(speedContainer);
      this.elements.speedControl = {
        slider: speedControl,
        display: speedDisplay
      };
    }
    
    // Add event listeners
    this.addEventListeners();
  }
  
  /**
   * Create a button element
   * @param {string} label - Button label
   * @param {string} icon - Button icon
   * @returns {HTMLButtonElement} - Button element
   */
  createButton(label, icon) {
    const button = document.createElement('button');
    button.title = label;
    button.textContent = icon;
    button.style.padding = '5px 10px';
    button.style.fontSize = '16px';
    button.style.backgroundColor = this.options.darkMode ? '#444' : '#fff';
    button.style.color = this.options.darkMode ? '#fff' : '#333';
    button.style.border = this.options.darkMode ? '1px solid #555' : '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    return button;
  }
  
  /**
   * Add event listeners to control elements
   */
  addEventListeners() {
    // Play button
    if (this.elements.playButton) {
      this.elements.playButton.addEventListener('click', () => {
        this.play();
      });
    }
    
    // Pause button
    if (this.elements.pauseButton) {
      this.elements.pauseButton.addEventListener('click', () => {
        this.pause();
      });
    }
    
    // Stop button
    if (this.elements.stopButton) {
      this.elements.stopButton.addEventListener('click', () => {
        this.stop();
      });
    }
    
    // Step button
    if (this.elements.stepButton) {
      this.elements.stepButton.addEventListener('click', () => {
        this.step();
      });
    }
    
    // Slider
    if (this.elements.slider) {
      this.elements.slider.addEventListener('input', (event) => {
        const percentage = parseInt(event.target.value);
        this.seekToPercentage(percentage);
      });
    }
    
    // Speed control
    if (this.elements.speedControl) {
      this.elements.speedControl.slider.addEventListener('input', (event) => {
        const speed = parseInt(event.target.value);
        this.setSpeed(speed);
      });
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
    this.simulator.on('simulationStep', this.handleSimulationStep.bind(this));
    this.simulator.on('simulationStart', this.handleSimulationStart.bind(this));
    this.simulator.on('simulationEnd', this.handleSimulationEnd.bind(this));
    this.simulator.on('simulationPause', this.handleSimulationPause.bind(this));
    this.simulator.on('simulationResume', this.handleSimulationResume.bind(this));
  }
  
  /**
   * Handle simulation step event
   * @param {Object} event - Event data
   */
  handleSimulationStep(event) {
    const { time, step } = event;
    
    // Update current time
    this.state.currentTime = time;
    
    // Update display
    this.updateDisplay();
  }
  
  /**
   * Handle simulation start event
   * @param {Object} event - Event data
   */
  handleSimulationStart(event) {
    // Reset state
    this.state.currentTime = 0;
    this.state.isPlaying = true;
    
    // Calculate total time
    if (this.simulator.config && this.simulator.config.duration_days) {
      this.state.totalTime = this.simulator.config.duration_days * 24 * 60; // minutes
    }
    
    // Update display
    this.updateDisplay();
    this.updatePlaybackState();
  }
  
  /**
   * Handle simulation end event
   * @param {Object} event - Event data
   */
  handleSimulationEnd(event) {
    // Update state
    this.state.isPlaying = false;
    
    // Update display
    this.updateDisplay();
    this.updatePlaybackState();
  }
  
  /**
   * Handle simulation pause event
   * @param {Object} event - Event data
   */
  handleSimulationPause(event) {
    // Update state
    this.state.isPlaying = false;
    
    // Update display
    this.updatePlaybackState();
  }
  
  /**
   * Handle simulation resume event
   * @param {Object} event - Event data
   */
  handleSimulationResume(event) {
    // Update state
    this.state.isPlaying = true;
    
    // Update display
    this.updatePlaybackState();
  }
  
  /**
   * Update display
   */
  updateDisplay() {
    // Update time display
    if (this.elements.timeDisplay) {
      const hours = Math.floor(this.state.currentTime / 60);
      const minutes = Math.floor(this.state.currentTime % 60);
      const days = Math.floor(hours / 24);
      const hoursOfDay = hours % 24;
      
      this.elements.timeDisplay.textContent = `Day ${days + 1}, ${hoursOfDay.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Update slider
    if (this.elements.slider && this.state.totalTime > 0) {
      const percentage = Math.floor((this.state.currentTime / this.state.totalTime) * 100);
      this.elements.slider.value = percentage.toString();
    }
  }
  
  /**
   * Update playback state
   */
  updatePlaybackState() {
    if (this.elements.playButton) {
      this.elements.playButton.disabled = this.state.isPlaying;
    }
    
    if (this.elements.pauseButton) {
      this.elements.pauseButton.disabled = !this.state.isPlaying;
    }
  }
  
  /**
   * Play the simulation
   */
  play() {
    if (this.state.isPlaying) return;
    
    // Update state
    this.state.isPlaying = true;
    
    // Emit resume event
    if (this.simulator && this.simulator.emit) {
      this.simulator.emit('simulationResume', { time: this.state.currentTime });
    }
    
    // Update display
    this.updatePlaybackState();
  }
  
  /**
   * Pause the simulation
   */
  pause() {
    if (!this.state.isPlaying) return;
    
    // Update state
    this.state.isPlaying = false;
    
    // Emit pause event
    if (this.simulator && this.simulator.emit) {
      this.simulator.emit('simulationPause', { time: this.state.currentTime });
    }
    
    // Update display
    this.updatePlaybackState();
  }
  
  /**
   * Stop the simulation
   */
  stop() {
    // Update state
    this.state.isPlaying = false;
    
    // Emit end event
    if (this.simulator && this.simulator.emit) {
      this.simulator.emit('simulationEnd', { time: this.state.currentTime });
    }
    
    // Update display
    this.updatePlaybackState();
  }
  
  /**
   * Step the simulation
   */
  step() {
    // Step the simulator
    if (this.simulator && this.simulator.step) {
      this.simulator.step();
    }
  }
  
  /**
   * Seek to a percentage of the total time
   * @param {number} percentage - Percentage (0-100)
   */
  seekToPercentage(percentage) {
    if (percentage < 0 || percentage > 100) return;
    
    // Calculate target time
    const targetTime = Math.floor((percentage / 100) * this.state.totalTime);
    
    // Seek to target time
    this.seekToTime(targetTime);
  }
  
  /**
   * Seek to a specific time
   * @param {number} targetTime - Target time in minutes
   */
  seekToTime(targetTime) {
    if (targetTime < 0 || targetTime > this.state.totalTime) return;
    
    // Check if we need to restart the simulation
    if (targetTime < this.state.currentTime) {
      // Restart simulation
      if (this.simulator && this.simulator.restart) {
        this.simulator.restart();
      }
    }
    
    // Run simulation until target time
    if (this.simulator && this.simulator.runUntil) {
      this.simulator.runUntil(targetTime);
    }
  }
  
  /**
   * Set simulation speed
   * @param {number} speed - Simulation speed
   */
  setSpeed(speed) {
    if (speed < this.options.minSpeed || speed > this.options.maxSpeed) return;
    
    // Update state
    this.state.speed = speed;
    
    // Update speed display
    if (this.elements.speedControl) {
      this.elements.speedControl.display.textContent = `${speed}x`;
    }
    
    // Update simulator speed
    if (this.simulator && this.simulator.setSpeed) {
      this.simulator.setSpeed(speed);
    }
  }
  
  /**
   * Set dark mode
   * @param {boolean} darkMode - Dark mode enabled
   */
  setDarkMode(darkMode) {
    this.options.darkMode = darkMode;
    
    // Update container style
    this.container.style.backgroundColor = darkMode ? '#333' : '#f5f5f5';
    this.container.style.color = darkMode ? '#fff' : '#333';
    
    // Update button styles
    const buttons = [
      this.elements.playButton,
      this.elements.pauseButton,
      this.elements.stopButton,
      this.elements.stepButton
    ];
    
    for (const button of buttons) {
      if (button) {
        button.style.backgroundColor = darkMode ? '#444' : '#fff';
        button.style.color = darkMode ? '#fff' : '#333';
        button.style.border = darkMode ? '1px solid #555' : '1px solid #ccc';
      }
    }
  }
  
  /**
   * Destroy the control
   */
  destroy() {
    // Remove event handlers
    if (this.simulator && this.simulator.off) {
      this.simulator.off('simulationStep', this.handleSimulationStep);
      this.simulator.off('simulationStart', this.handleSimulationStart);
      this.simulator.off('simulationEnd', this.handleSimulationEnd);
      this.simulator.off('simulationPause', this.handleSimulationPause);
      this.simulator.off('simulationResume', this.handleSimulationResume);
    }
    
    // Clear container
    this.container.innerHTML = '';
  }
}

// Export the class
export default TimelineControl;
