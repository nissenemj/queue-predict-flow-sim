/**
 * ChartRenderer.js
 * Utility for rendering charts in the analytics dashboard
 */

/**
 * Chart Renderer class
 * Provides methods for rendering different types of charts
 */
class ChartRenderer {
  /**
   * Constructor for the ChartRenderer class
   * @param {Object} options - Renderer options
   */
  constructor(options = {}) {
    this.options = {
      darkMode: options.darkMode || false,
      colors: options.colors || [
        '#4285F4', // Blue
        '#EA4335', // Red
        '#FBBC05', // Yellow
        '#34A853', // Green
        '#8AB4F8', // Light blue
        '#F6AEA9', // Light red
        '#FDE293', // Light yellow
        '#A8DAB5'  // Light green
      ],
      fontFamily: options.fontFamily || 'Arial, sans-serif',
      ...options
    };
    
    // Set default styles based on mode
    if (this.options.darkMode) {
      this.options.backgroundColor = options.backgroundColor || '#333';
      this.options.textColor = options.textColor || '#fff';
      this.options.gridColor = options.gridColor || '#444';
      this.options.axisColor = options.axisColor || '#666';
    } else {
      this.options.backgroundColor = options.backgroundColor || '#fff';
      this.options.textColor = options.textColor || '#333';
      this.options.gridColor = options.gridColor || '#eee';
      this.options.axisColor = options.axisColor || '#ccc';
    }
  }
  
  /**
   * Render a line chart
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   */
  renderLineChart(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = this.options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Set chart options
    const chartOptions = {
      padding: options.padding || { top: 20, right: 20, bottom: 30, left: 40 },
      showLegend: options.showLegend !== false,
      showGrid: options.showGrid !== false,
      showPoints: options.showPoints !== false,
      lineWidth: options.lineWidth || 2,
      pointRadius: options.pointRadius || 3,
      ...options
    };
    
    // Calculate chart area
    const chartArea = {
      x: chartOptions.padding.left,
      y: chartOptions.padding.top,
      width: width - chartOptions.padding.left - chartOptions.padding.right,
      height: height - chartOptions.padding.top - chartOptions.padding.bottom
    };
    
    // Draw grid
    if (chartOptions.showGrid) {
      this.drawGrid(ctx, chartArea, chartOptions);
    }
    
    // Draw axes
    this.drawAxes(ctx, chartArea, chartOptions);
    
    // Draw data
    this.drawLineData(ctx, chartArea, data, chartOptions);
    
    // Draw legend
    if (chartOptions.showLegend && data.datasets && data.datasets.length > 1) {
      this.drawLegend(ctx, chartArea, data, chartOptions);
    }
  }
  
  /**
   * Draw grid
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} chartArea - Chart area
   * @param {Object} options - Chart options
   */
  drawGrid(ctx, chartArea, options) {
    const { x, y, width, height } = chartArea;
    
    ctx.strokeStyle = this.options.gridColor;
    ctx.lineWidth = 0.5;
    
    // Draw horizontal grid lines
    const yStep = height / 4;
    for (let i = 0; i <= 4; i++) {
      const yPos = y + i * yStep;
      ctx.beginPath();
      ctx.moveTo(x, yPos);
      ctx.lineTo(x + width, yPos);
      ctx.stroke();
    }
    
    // Draw vertical grid lines
    const xStep = width / 4;
    for (let i = 0; i <= 4; i++) {
      const xPos = x + i * xStep;
      ctx.beginPath();
      ctx.moveTo(xPos, y);
      ctx.lineTo(xPos, y + height);
      ctx.stroke();
    }
  }
  
  /**
   * Draw axes
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} chartArea - Chart area
   * @param {Object} options - Chart options
   */
  drawAxes(ctx, chartArea, options) {
    const { x, y, width, height } = chartArea;
    
    ctx.strokeStyle = this.options.axisColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = this.options.textColor;
    ctx.font = `12px ${this.options.fontFamily}`;
    ctx.textAlign = 'center';
    
    // Draw x-axis
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();
    
    // Draw y-axis
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.stroke();
    
    // Draw x-axis labels
    const xStep = width / 4;
    for (let i = 0; i <= 4; i++) {
      const xPos = x + i * xStep;
      const label = options.xLabels ? options.xLabels[i] : i.toString();
      
      ctx.fillText(label || '', xPos, y + height + 15);
    }
    
    // Draw y-axis labels
    const yStep = height / 4;
    for (let i = 0; i <= 4; i++) {
      const yPos = y + height - i * yStep;
      const label = options.yLabels ? options.yLabels[i] : i.toString();
      
      ctx.textAlign = 'right';
      ctx.fillText(label || '', x - 5, yPos + 4);
    }
    
    // Draw axis titles
    if (options.xAxisTitle) {
      ctx.textAlign = 'center';
      ctx.fillText(options.xAxisTitle, x + width / 2, y + height + 30);
    }
    
    if (options.yAxisTitle) {
      ctx.save();
      ctx.translate(x - 30, y + height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(options.yAxisTitle, 0, 0);
      ctx.restore();
    }
  }
  
  /**
   * Draw line data
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} chartArea - Chart area
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   */
  drawLineData(ctx, chartArea, data, options) {
    const { x, y, width, height } = chartArea;
    
    if (!data.datasets || data.datasets.length === 0) {
      return;
    }
    
    // Find min and max values
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const dataset of data.datasets) {
      for (const point of dataset.data) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
    
    // Ensure min and max are valid
    if (!isFinite(minX)) minX = 0;
    if (!isFinite(maxX)) maxX = 100;
    if (!isFinite(minY)) minY = 0;
    if (!isFinite(maxY)) maxY = 100;
    
    // Add some padding to the ranges
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    
    minX -= xRange * 0.05;
    maxX += xRange * 0.05;
    minY -= yRange * 0.05;
    maxY += yRange * 0.05;
    
    // Ensure minY is 0 if close to it
    if (minY > -0.1 * yRange) minY = 0;
    
    // Draw each dataset
    data.datasets.forEach((dataset, index) => {
      const color = dataset.color || this.options.colors[index % this.options.colors.length];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = options.lineWidth;
      ctx.lineJoin = 'round';
      
      // Draw line
      ctx.beginPath();
      
      dataset.data.forEach((point, i) => {
        const xPos = x + ((point.x - minX) / (maxX - minX)) * width;
        const yPos = y + height - ((point.y - minY) / (maxY - minY)) * height;
        
        if (i === 0) {
          ctx.moveTo(xPos, yPos);
        } else {
          ctx.lineTo(xPos, yPos);
        }
      });
      
      ctx.stroke();
      
      // Draw points
      if (options.showPoints) {
        ctx.fillStyle = color;
        
        dataset.data.forEach(point => {
          const xPos = x + ((point.x - minX) / (maxX - minX)) * width;
          const yPos = y + height - ((point.y - minY) / (maxY - minY)) * height;
          
          ctx.beginPath();
          ctx.arc(xPos, yPos, options.pointRadius, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
  }
  
  /**
   * Draw legend
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} chartArea - Chart area
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   */
  drawLegend(ctx, chartArea, data, options) {
    const { x, y, width } = chartArea;
    
    const legendY = y - 10;
    const legendItemWidth = width / data.datasets.length;
    
    data.datasets.forEach((dataset, index) => {
      const color = dataset.color || this.options.colors[index % this.options.colors.length];
      const legendX = x + index * legendItemWidth;
      
      // Draw color box
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY, 10, 10);
      
      // Draw label
      ctx.fillStyle = this.options.textColor;
      ctx.font = `12px ${this.options.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.fillText(dataset.label || `Dataset ${index + 1}`, legendX + 15, legendY + 9);
    });
  }
  
  /**
   * Render a bar chart
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   */
  renderBarChart(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = this.options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Set chart options
    const chartOptions = {
      padding: options.padding || { top: 20, right: 20, bottom: 30, left: 40 },
      showLegend: options.showLegend !== false,
      showGrid: options.showGrid !== false,
      barWidth: options.barWidth || 0.7, // 0-1, percentage of available space
      ...options
    };
    
    // Calculate chart area
    const chartArea = {
      x: chartOptions.padding.left,
      y: chartOptions.padding.top,
      width: width - chartOptions.padding.left - chartOptions.padding.right,
      height: height - chartOptions.padding.top - chartOptions.padding.bottom
    };
    
    // Draw grid
    if (chartOptions.showGrid) {
      this.drawGrid(ctx, chartArea, chartOptions);
    }
    
    // Draw axes
    this.drawAxes(ctx, chartArea, chartOptions);
    
    // Draw data
    this.drawBarData(ctx, chartArea, data, chartOptions);
    
    // Draw legend
    if (chartOptions.showLegend && data.datasets && data.datasets.length > 1) {
      this.drawLegend(ctx, chartArea, data, chartOptions);
    }
  }
  
  /**
   * Draw bar data
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} chartArea - Chart area
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   */
  drawBarData(ctx, chartArea, data, options) {
    const { x, y, width, height } = chartArea;
    
    if (!data.datasets || data.datasets.length === 0 || !data.labels || data.labels.length === 0) {
      return;
    }
    
    const numBars = data.labels.length;
    const barGroupWidth = width / numBars;
    const barWidth = barGroupWidth * options.barWidth / data.datasets.length;
    
    // Find max value
    let maxY = -Infinity;
    
    for (const dataset of data.datasets) {
      for (const value of dataset.data) {
        maxY = Math.max(maxY, value);
      }
    }
    
    // Ensure max is valid
    if (!isFinite(maxY)) maxY = 100;
    
    // Add some padding to the range
    maxY += maxY * 0.1;
    
    // Draw each dataset
    data.datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.color || this.options.colors[datasetIndex % this.options.colors.length];
      
      ctx.fillStyle = color;
      
      dataset.data.forEach((value, index) => {
        const barX = x + index * barGroupWidth + datasetIndex * barWidth;
        const barHeight = (value / maxY) * height;
        const barY = y + height - barHeight;
        
        ctx.fillRect(barX, barY, barWidth, barHeight);
      });
    });
  }
  
  /**
   * Render a pie chart
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   */
  renderPieChart(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = this.options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Set chart options
    const chartOptions = {
      padding: options.padding || { top: 20, right: 20, bottom: 20, left: 20 },
      showLegend: options.showLegend !== false,
      innerRadius: options.innerRadius || 0, // 0 for pie, >0 for donut
      ...options
    };
    
    // Calculate chart area
    const chartArea = {
      x: chartOptions.padding.left,
      y: chartOptions.padding.top,
      width: width - chartOptions.padding.left - chartOptions.padding.right,
      height: height - chartOptions.padding.top - chartOptions.padding.bottom
    };
    
    // Draw data
    this.drawPieData(ctx, chartArea, data, chartOptions);
    
    // Draw legend
    if (chartOptions.showLegend) {
      this.drawPieLegend(ctx, chartArea, data, chartOptions);
    }
  }
  
  /**
   * Draw pie data
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} chartArea - Chart area
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   */
  drawPieData(ctx, chartArea, data, options) {
    const { x, y, width, height } = chartArea;
    
    if (!data.values || data.values.length === 0) {
      return;
    }
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * options.innerRadius;
    
    // Calculate total
    const total = data.values.reduce((sum, value) => sum + value, 0);
    
    // Draw slices
    let startAngle = -Math.PI / 2; // Start at top
    
    data.values.forEach((value, index) => {
      const sliceAngle = (value / total) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;
      const color = data.colors && data.colors[index] ? data.colors[index] : this.options.colors[index % this.options.colors.length];
      
      ctx.fillStyle = color;
      
      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
      
      // Draw inner circle for donut chart
      if (options.innerRadius > 0) {
        ctx.fillStyle = this.options.backgroundColor;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
      
      // Draw label if there's enough space
      if (sliceAngle > 0.2) {
        const labelRadius = radius * 0.7;
        const labelAngle = startAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius;
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold 12px ${this.options.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toString(), labelX, labelY);
      }
      
      startAngle = endAngle;
    });
  }
  
  /**
   * Draw pie legend
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} chartArea - Chart area
   * @param {Object} data - Chart data
   * @param {Object} options - Chart options
   */
  drawPieLegend(ctx, chartArea, data, options) {
    const { x, y, width, height } = chartArea;
    
    const legendX = x + width + 10;
    const legendY = y;
    const legendItemHeight = 20;
    
    data.labels.forEach((label, index) => {
      const color = data.colors && data.colors[index] ? data.colors[index] : this.options.colors[index % this.options.colors.length];
      const itemY = legendY + index * legendItemHeight;
      
      // Draw color box
      ctx.fillStyle = color;
      ctx.fillRect(legendX, itemY, 10, 10);
      
      // Draw label
      ctx.fillStyle = this.options.textColor;
      ctx.font = `12px ${this.options.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.fillText(label, legendX + 15, itemY + 9);
    });
  }
}

// Export the class
export default ChartRenderer;
