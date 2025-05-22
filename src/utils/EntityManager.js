/**
 * Entity Manager class for managing simulation entities
 * Provides efficient storage, retrieval, and querying of entities
 */
class EntityManager {
  /**
   * Constructor for the EntityManager class
   */
  constructor() {
    this.entities = new Map(); // Map of entity ID to entity
    this.entityTypes = new Map(); // Map of entity type to set of entity IDs
    this.entityAttributes = new Map(); // Map of attribute name to map of attribute value to set of entity IDs
    this.entityCount = 0;
  }

  /**
   * Add an entity to the manager
   * @param {Object} entity - Entity to add (must have an id property)
   * @returns {boolean} - True if the entity was added successfully
   */
  addEntity(entity) {
    if (!entity || !entity.id) {
      console.error('Entity must have an id property');
      return false;
    }

    if (this.entities.has(entity.id)) {
      console.warn(`Entity with id ${entity.id} already exists`);
      return false;
    }

    // Add to entities map
    this.entities.set(entity.id, entity);
    this.entityCount++;

    // Add to entity types map
    const type = entity.type || entity.constructor.name;
    if (!this.entityTypes.has(type)) {
      this.entityTypes.set(type, new Set());
    }
    this.entityTypes.get(type).add(entity.id);

    // Add to entity attributes map
    for (const [key, value] of Object.entries(entity)) {
      if (key === 'id' || typeof value === 'function') continue;

      // Convert value to string for use as map key
      const valueKey = String(value);
      
      if (!this.entityAttributes.has(key)) {
        this.entityAttributes.set(key, new Map());
      }
      
      const attributeMap = this.entityAttributes.get(key);
      if (!attributeMap.has(valueKey)) {
        attributeMap.set(valueKey, new Set());
      }
      
      attributeMap.get(valueKey).add(entity.id);
    }

    return true;
  }

  /**
   * Remove an entity from the manager
   * @param {string|Object} entityOrId - Entity or entity ID to remove
   * @returns {boolean} - True if the entity was removed successfully
   */
  removeEntity(entityOrId) {
    const id = typeof entityOrId === 'object' ? entityOrId.id : entityOrId;
    
    if (!this.entities.has(id)) {
      console.warn(`Entity with id ${id} does not exist`);
      return false;
    }

    const entity = this.entities.get(id);
    
    // Remove from entities map
    this.entities.delete(id);
    this.entityCount--;

    // Remove from entity types map
    const type = entity.type || entity.constructor.name;
    if (this.entityTypes.has(type)) {
      this.entityTypes.get(type).delete(id);
      if (this.entityTypes.get(type).size === 0) {
        this.entityTypes.delete(type);
      }
    }

    // Remove from entity attributes map
    for (const [key, value] of Object.entries(entity)) {
      if (key === 'id' || typeof value === 'function') continue;

      const valueKey = String(value);
      
      if (this.entityAttributes.has(key)) {
        const attributeMap = this.entityAttributes.get(key);
        if (attributeMap.has(valueKey)) {
          attributeMap.get(valueKey).delete(id);
          if (attributeMap.get(valueKey).size === 0) {
            attributeMap.delete(valueKey);
          }
        }
        
        if (attributeMap.size === 0) {
          this.entityAttributes.delete(key);
        }
      }
    }

    return true;
  }

  /**
   * Update an entity in the manager
   * @param {Object} entity - Entity to update (must have an id property)
   * @returns {boolean} - True if the entity was updated successfully
   */
  updateEntity(entity) {
    if (!entity || !entity.id) {
      console.error('Entity must have an id property');
      return false;
    }

    if (!this.entities.has(entity.id)) {
      console.warn(`Entity with id ${entity.id} does not exist`);
      return false;
    }

    // Remove old entity
    this.removeEntity(entity.id);
    
    // Add updated entity
    this.addEntity(entity);
    
    return true;
  }

  /**
   * Get an entity by ID
   * @param {string} id - Entity ID
   * @returns {Object|null} - Entity or null if not found
   */
  getEntity(id) {
    return this.entities.get(id) || null;
  }

  /**
   * Get all entities
   * @returns {Array} - Array of all entities
   */
  getAllEntities() {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities by type
   * @param {string} type - Entity type
   * @returns {Array} - Array of entities of the specified type
   */
  getEntitiesByType(type) {
    if (!this.entityTypes.has(type)) {
      return [];
    }
    
    return Array.from(this.entityTypes.get(type))
      .map(id => this.entities.get(id));
  }

  /**
   * Get entities by attribute value
   * @param {string} attribute - Attribute name
   * @param {*} value - Attribute value
   * @returns {Array} - Array of entities with the specified attribute value
   */
  getEntitiesByAttribute(attribute, value) {
    if (!this.entityAttributes.has(attribute)) {
      return [];
    }
    
    const attributeMap = this.entityAttributes.get(attribute);
    const valueKey = String(value);
    
    if (!attributeMap.has(valueKey)) {
      return [];
    }
    
    return Array.from(attributeMap.get(valueKey))
      .map(id => this.entities.get(id));
  }

  /**
   * Query entities based on a filter function
   * @param {Function} filterFn - Filter function that takes an entity and returns a boolean
   * @returns {Array} - Array of entities that match the filter
   */
  queryEntities(filterFn) {
    return Array.from(this.entities.values()).filter(filterFn);
  }

  /**
   * Get the number of entities
   * @returns {number} - Number of entities
   */
  getEntityCount() {
    return this.entityCount;
  }

  /**
   * Clear all entities
   */
  clear() {
    this.entities.clear();
    this.entityTypes.clear();
    this.entityAttributes.clear();
    this.entityCount = 0;
  }
}

export default EntityManager;
