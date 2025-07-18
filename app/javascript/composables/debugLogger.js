/**
 * Enhanced debug logger for drag and drop operations
 */
export class DebugLogger {
  constructor(enabled = false, component = "unknown") {
    this.enabled = enabled;
    this.component = component;
    this.lastActionTime = Date.now();
    this.dragSequence = 0;
    this.sequenceEvents = 0;
  }

  /**
   * Log start of a drag operation
   * @param {Object} data - Drag start data
   */
  dragStart(data) {
    if (!this.enabled) return;
    this.dragSequence++;
    this.sequenceEvents = 0;
    console.group(
      `🎮 Drag Operation #${this.dragSequence} [${this.component}]`,
    );
    console.log(
      `%c📌 DRAG START at ${this._getTime()}`,
      "color: #4CAF50; font-weight: bold",
      data,
    );
    this.lastActionTime = Date.now();
  }

  /**
   * Log a move event during dragging
   * @param {Object} data - Drag move data
   */
  dragMove(data) {
    if (!this.enabled) return;
    this.sequenceEvents++;

    // Only log every 5th move event to reduce noise, or if target changes
    const shouldLog =
      this.sequenceEvents % 5 === 0 ||
      (this._lastTarget && this._lastTarget !== data.target?.index);

    if (shouldLog) {
      const elapsed = Date.now() - this.lastActionTime;
      console.log(
        `%c🔄 MOVE ${this.sequenceEvents} (+${elapsed}ms): mouse@${data.mouseY.toFixed(1)}px → target=${JSON.stringify(data.target)}`,
        "color: #2196F3",
        data.positions ? { affected: data.positions.length } : "",
      );
      this.lastActionTime = Date.now();
      this._lastTarget = data.target?.index;
    }
  }

  /**
   * Log the end of a drag operation
   * @param {Object} data - Drag end data
   */
  dragEnd(data) {
    if (!this.enabled) return;
    console.log(
      `%c👆 DRAG END: from=${data.from} to=${data.to}${data.success ? " ✅ REORDERED" : ""}`,
      `color: ${data.success ? "#4CAF50" : "#FFC107"}; font-weight: bold`,
    );
    console.groupEnd();
    this._lastTarget = undefined;
  }

  /**
   * Log an error that occurred during drag operations
   * @param {string} message - Error message
   * @param {Error|any} error - Error object or data
   */
  error(message, error) {
    if (!this.enabled) return;
    console.error(
      `%c⛔ ERROR: ${message}`,
      "color: #F44336; font-weight: bold",
      error,
    );
    console.trace("Stack trace");
  }

  /**
   * Log system events like measurements or updates
   * @param {string} event - Event description
   * @param {any} data - Event data
   */
  system(event, data) {
    if (!this.enabled) return;
    console.log(`%c🔧 SYSTEM: ${event}`, "color: #9C27B0", data);
  }

  /**
   * Get formatted timestamp for logging
   * @returns {string} Formatted time
   */
  _getTime() {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
  }
}

/**
 * Create a named debug logger
 * @param {string} component - Component name
 * @param {boolean} enabled - Whether logging is enabled
 * @returns {DebugLogger} Logger instance
 */
export function createLogger(component, enabled = false) {
  return new DebugLogger(enabled, component);
}
