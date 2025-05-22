/**
 * Priority Queue implementation for efficient event scheduling
 * Uses a binary heap for O(log n) insertion and removal
 */
class PriorityQueue {
  /**
   * Constructor for the PriorityQueue class
   * @param {Function} comparator - Function to compare elements (defaults to min-heap)
   */
  constructor(comparator = (a, b) => a.priority - b.priority) {
    this.heap = [];
    this.comparator = comparator;
    this.size = 0;
  }

  /**
   * Get the parent index of a node
   * @param {number} index - Index of the node
   * @returns {number} - Index of the parent node
   * @private
   */
  _parent(index) {
    return Math.floor((index - 1) / 2);
  }

  /**
   * Get the left child index of a node
   * @param {number} index - Index of the node
   * @returns {number} - Index of the left child node
   * @private
   */
  _leftChild(index) {
    return 2 * index + 1;
  }

  /**
   * Get the right child index of a node
   * @param {number} index - Index of the node
   * @returns {number} - Index of the right child node
   * @private
   */
  _rightChild(index) {
    return 2 * index + 2;
  }

  /**
   * Swap two elements in the heap
   * @param {number} i - Index of the first element
   * @param {number} j - Index of the second element
   * @private
   */
  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  /**
   * Bubble up an element to maintain heap property
   * @param {number} index - Index of the element to bubble up
   * @private
   */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = this._parent(index);
      if (this.comparator(this.heap[index], this.heap[parentIndex]) >= 0) {
        break;
      }
      this._swap(index, parentIndex);
      index = parentIndex;
    }
  }

  /**
   * Bubble down an element to maintain heap property
   * @param {number} index - Index of the element to bubble down
   * @private
   */
  _bubbleDown(index) {
    const lastIndex = this.size - 1;
    
    while (true) {
      const leftChildIndex = this._leftChild(index);
      const rightChildIndex = this._rightChild(index);
      let smallestIndex = index;
      
      if (leftChildIndex <= lastIndex && 
          this.comparator(this.heap[leftChildIndex], this.heap[smallestIndex]) < 0) {
        smallestIndex = leftChildIndex;
      }
      
      if (rightChildIndex <= lastIndex && 
          this.comparator(this.heap[rightChildIndex], this.heap[smallestIndex]) < 0) {
        smallestIndex = rightChildIndex;
      }
      
      if (smallestIndex === index) {
        break;
      }
      
      this._swap(index, smallestIndex);
      index = smallestIndex;
    }
  }

  /**
   * Check if the queue is empty
   * @returns {boolean} - True if the queue is empty
   */
  isEmpty() {
    return this.size === 0;
  }

  /**
   * Get the number of elements in the queue
   * @returns {number} - Number of elements
   */
  getSize() {
    return this.size;
  }

  /**
   * Peek at the highest priority element without removing it
   * @returns {*} - Highest priority element or null if empty
   */
  peek() {
    return this.isEmpty() ? null : this.heap[0];
  }

  /**
   * Add an element to the queue
   * @param {*} element - Element to add
   * @param {number} priority - Priority of the element
   */
  enqueue(element, priority) {
    const node = { element, priority };
    this.heap.push(node);
    this.size++;
    this._bubbleUp(this.size - 1);
    return node;
  }

  /**
   * Remove and return the highest priority element
   * @returns {*} - Highest priority element or null if empty
   */
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    
    const min = this.heap[0].element;
    const last = this.heap.pop();
    this.size--;
    
    if (this.size > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    
    return min;
  }

  /**
   * Remove a specific element from the queue
   * @param {*} element - Element to remove
   * @param {Function} equalityFn - Function to check equality (defaults to ===)
   * @returns {boolean} - True if the element was found and removed
   */
  remove(element, equalityFn = (a, b) => a === b) {
    for (let i = 0; i < this.size; i++) {
      if (equalityFn(this.heap[i].element, element)) {
        // Replace with the last element
        const last = this.heap.pop();
        this.size--;
        
        if (i === this.size) {
          // If the removed element was the last one, we're done
          return true;
        }
        
        // Put the last element in the removed element's place
        this.heap[i] = last;
        
        // Fix the heap property
        const parent = this._parent(i);
        if (i > 0 && this.comparator(this.heap[i], this.heap[parent]) < 0) {
          this._bubbleUp(i);
        } else {
          this._bubbleDown(i);
        }
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Update the priority of an element
   * @param {*} element - Element to update
   * @param {number} newPriority - New priority
   * @param {Function} equalityFn - Function to check equality (defaults to ===)
   * @returns {boolean} - True if the element was found and updated
   */
  updatePriority(element, newPriority, equalityFn = (a, b) => a === b) {
    for (let i = 0; i < this.size; i++) {
      if (equalityFn(this.heap[i].element, element)) {
        const oldPriority = this.heap[i].priority;
        this.heap[i].priority = newPriority;
        
        if (newPriority < oldPriority) {
          this._bubbleUp(i);
        } else if (newPriority > oldPriority) {
          this._bubbleDown(i);
        }
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Clear the queue
   */
  clear() {
    this.heap = [];
    this.size = 0;
  }

  /**
   * Convert the queue to an array (for debugging)
   * @returns {Array} - Array representation of the queue
   */
  toArray() {
    return [...this.heap].map(node => node.element);
  }
}

export default PriorityQueue;
