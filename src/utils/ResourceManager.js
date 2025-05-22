/**
 * Resource Manager class for managing simulation resources
 * Provides efficient storage, retrieval, and allocation of resources
 */
class ResourceManager {
  /**
   * Constructor for the ResourceManager class
   */
  constructor() {
    this.resources = new Map(); // Map of resource ID to resource
    this.resourceTypes = new Map(); // Map of resource type to set of resource IDs
    this.resourcePools = new Map(); // Map of pool name to set of resource IDs
    this.resourceStats = new Map(); // Map of resource ID to resource statistics
  }

  /**
   * Add a resource to the manager
   * @param {Object} resource - Resource to add (must have an id property)
   * @param {string} poolName - Optional pool name to add the resource to
   * @returns {boolean} - True if the resource was added successfully
   */
  addResource(resource, poolName = null) {
    if (!resource || !resource.id) {
      console.error('Resource must have an id property');
      return false;
    }

    if (this.resources.has(resource.id)) {
      console.warn(`Resource with id ${resource.id} already exists`);
      return false;
    }

    // Add to resources map
    this.resources.set(resource.id, resource);

    // Add to resource types map
    const type = resource.type || resource.constructor.name;
    if (!this.resourceTypes.has(type)) {
      this.resourceTypes.set(type, new Set());
    }
    this.resourceTypes.get(type).add(resource.id);

    // Add to resource pools map if pool name is provided
    if (poolName) {
      if (!this.resourcePools.has(poolName)) {
        this.resourcePools.set(poolName, new Set());
      }
      this.resourcePools.get(poolName).add(resource.id);
    }

    // Initialize resource statistics
    this.resourceStats.set(resource.id, {
      totalAllocations: 0,
      totalReleases: 0,
      totalAllocationTime: 0,
      currentAllocations: 0,
      peakAllocations: 0,
      lastUpdateTime: 0,
      utilizationHistory: []
    });

    return true;
  }

  /**
   * Remove a resource from the manager
   * @param {string|Object} resourceOrId - Resource or resource ID to remove
   * @returns {boolean} - True if the resource was removed successfully
   */
  removeResource(resourceOrId) {
    const id = typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId;
    
    if (!this.resources.has(id)) {
      console.warn(`Resource with id ${id} does not exist`);
      return false;
    }

    const resource = this.resources.get(id);
    
    // Remove from resources map
    this.resources.delete(id);

    // Remove from resource types map
    const type = resource.type || resource.constructor.name;
    if (this.resourceTypes.has(type)) {
      this.resourceTypes.get(type).delete(id);
      if (this.resourceTypes.get(type).size === 0) {
        this.resourceTypes.delete(type);
      }
    }

    // Remove from resource pools map
    for (const [poolName, poolResources] of this.resourcePools.entries()) {
      if (poolResources.has(id)) {
        poolResources.delete(id);
        if (poolResources.size === 0) {
          this.resourcePools.delete(poolName);
        }
      }
    }

    // Remove resource statistics
    this.resourceStats.delete(id);

    return true;
  }

  /**
   * Get a resource by ID
   * @param {string} id - Resource ID
   * @returns {Object|null} - Resource or null if not found
   */
  getResource(id) {
    return this.resources.get(id) || null;
  }

  /**
   * Get all resources
   * @returns {Array} - Array of all resources
   */
  getAllResources() {
    return Array.from(this.resources.values());
  }

  /**
   * Get resources by type
   * @param {string} type - Resource type
   * @returns {Array} - Array of resources of the specified type
   */
  getResourcesByType(type) {
    if (!this.resourceTypes.has(type)) {
      return [];
    }
    
    return Array.from(this.resourceTypes.get(type))
      .map(id => this.resources.get(id));
  }

  /**
   * Get resources by pool
   * @param {string} poolName - Pool name
   * @returns {Array} - Array of resources in the specified pool
   */
  getResourcesByPool(poolName) {
    if (!this.resourcePools.has(poolName)) {
      return [];
    }
    
    return Array.from(this.resourcePools.get(poolName))
      .map(id => this.resources.get(id));
  }

  /**
   * Add a resource to a pool
   * @param {string|Object} resourceOrId - Resource or resource ID to add
   * @param {string} poolName - Pool name
   * @returns {boolean} - True if the resource was added to the pool successfully
   */
  addResourceToPool(resourceOrId, poolName) {
    const id = typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId;
    
    if (!this.resources.has(id)) {
      console.warn(`Resource with id ${id} does not exist`);
      return false;
    }

    if (!this.resourcePools.has(poolName)) {
      this.resourcePools.set(poolName, new Set());
    }
    
    this.resourcePools.get(poolName).add(id);
    return true;
  }

  /**
   * Remove a resource from a pool
   * @param {string|Object} resourceOrId - Resource or resource ID to remove
   * @param {string} poolName - Pool name
   * @returns {boolean} - True if the resource was removed from the pool successfully
   */
  removeResourceFromPool(resourceOrId, poolName) {
    const id = typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId;
    
    if (!this.resources.has(id)) {
      console.warn(`Resource with id ${id} does not exist`);
      return false;
    }

    if (!this.resourcePools.has(poolName)) {
      return false;
    }
    
    const result = this.resourcePools.get(poolName).delete(id);
    
    if (this.resourcePools.get(poolName).size === 0) {
      this.resourcePools.delete(poolName);
    }
    
    return result;
  }

  /**
   * Allocate a resource to an entity
   * @param {string} resourceId - Resource ID
   * @param {Object} entity - Entity to allocate the resource to
   * @param {number} amount - Amount of resource to allocate
   * @param {number} time - Current simulation time
   * @returns {boolean} - True if allocation was successful
   */
  allocateResource(resourceId, entity, amount = 1, time) {
    const resource = this.resources.get(resourceId);
    
    if (!resource) {
      console.warn(`Resource with id ${resourceId} does not exist`);
      return false;
    }
    
    if (!resource.allocate) {
      console.error(`Resource with id ${resourceId} does not have an allocate method`);
      return false;
    }
    
    const success = resource.allocate(entity, amount, time);
    
    if (success) {
      // Update resource statistics
      const stats = this.resourceStats.get(resourceId);
      stats.totalAllocations++;
      stats.currentAllocations += amount;
      stats.peakAllocations = Math.max(stats.peakAllocations, stats.currentAllocations);
      
      // Record utilization
      const utilizationRate = resource.getUtilizationRate ? 
        resource.getUtilizationRate() : 
        (resource.capacity && resource.available ? 
          (resource.capacity - resource.available) / resource.capacity : 
          null);
      
      if (utilizationRate !== null) {
        stats.utilizationHistory.push({
          time,
          rate: utilizationRate
        });
      }
      
      stats.lastUpdateTime = time;
    }
    
    return success;
  }

  /**
   * Release a resource from an entity
   * @param {string} resourceId - Resource ID
   * @param {Object} entity - Entity to release the resource from
   * @param {number} time - Current simulation time
   * @returns {boolean} - True if release was successful
   */
  releaseResource(resourceId, entity, time) {
    const resource = this.resources.get(resourceId);
    
    if (!resource) {
      console.warn(`Resource with id ${resourceId} does not exist`);
      return false;
    }
    
    if (!resource.release) {
      console.error(`Resource with id ${resourceId} does not have a release method`);
      return false;
    }
    
    const success = resource.release(entity, time);
    
    if (success) {
      // Update resource statistics
      const stats = this.resourceStats.get(resourceId);
      stats.totalReleases++;
      
      // Get the amount that was released (if available)
      let releasedAmount = 1;
      if (resource.assignments && entity.id) {
        const assignment = resource.assignments.get(entity.id);
        if (assignment) {
          releasedAmount = assignment.amount;
          
          // Update total allocation time
          stats.totalAllocationTime += (time - assignment.startTime) * releasedAmount;
        }
      }
      
      stats.currentAllocations = Math.max(0, stats.currentAllocations - releasedAmount);
      
      // Record utilization
      const utilizationRate = resource.getUtilizationRate ? 
        resource.getUtilizationRate() : 
        (resource.capacity && resource.available ? 
          (resource.capacity - resource.available) / resource.capacity : 
          null);
      
      if (utilizationRate !== null) {
        stats.utilizationHistory.push({
          time,
          rate: utilizationRate
        });
      }
      
      stats.lastUpdateTime = time;
    }
    
    return success;
  }

  /**
   * Get resource statistics
   * @param {string} resourceId - Resource ID
   * @returns {Object|null} - Resource statistics or null if not found
   */
  getResourceStats(resourceId) {
    return this.resourceStats.get(resourceId) || null;
  }

  /**
   * Get average utilization of a resource over a time period
   * @param {string} resourceId - Resource ID
   * @param {number} startTime - Start time
   * @param {number} endTime - End time
   * @returns {number|null} - Average utilization rate or null if not available
   */
  getAverageUtilization(resourceId, startTime, endTime) {
    const stats = this.resourceStats.get(resourceId);
    
    if (!stats) {
      return null;
    }
    
    const history = stats.utilizationHistory.filter(
      entry => entry.time >= startTime && entry.time <= endTime
    );
    
    if (history.length === 0) {
      return null;
    }
    
    const sum = history.reduce((acc, entry) => acc + entry.rate, 0);
    return sum / history.length;
  }

  /**
   * Clear all resources
   */
  clear() {
    this.resources.clear();
    this.resourceTypes.clear();
    this.resourcePools.clear();
    this.resourceStats.clear();
  }
}

export default ResourceManager;
