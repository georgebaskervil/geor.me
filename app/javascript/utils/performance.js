/**
 * Performance optimization utilities for managing will-change properties
 * and other performance-related optimizations
 */

/**
 * Enables will-change optimization for an element
 * @param {HTMLElement} element - The element to optimize
 * @param {string|string[]} properties - CSS properties that will change
 */
export function enableWillChange(element, properties) {
  if (!element) return;

  const propertiesString = Array.isArray(properties)
    ? properties.join(", ")
    : properties;
  element.style.willChange = propertiesString;
}

/**
 * Disables will-change optimization for an element
 * @param {HTMLElement} element - The element to reset
 */
export function disableWillChange(element) {
  if (!element) return;

  element.style.willChange = "auto";
}

/**
 * Temporarily enables will-change for the duration of an animation
 * @param {HTMLElement} element - The element to optimize
 * @param {string|string[]} properties - CSS properties that will change
 * @param {number} duration - Duration in milliseconds (optional)
 */
export function temporaryWillChange(element, properties, duration = 300) {
  if (!element) return;

  enableWillChange(element, properties);

  // Clear will-change after animation completes
  setTimeout(() => {
    disableWillChange(element);
  }, duration);
}

/**
 * Optimizes an element for hover animations
 * @param {HTMLElement} element - The element to optimize
 * @param {string|string[]} properties - CSS properties that will change on hover
 */
export function optimizeForHover(element, properties = ["transform"]) {
  if (!element) return;

  element.addEventListener("mouseenter", () => {
    enableWillChange(element, properties);
  });

  element.addEventListener("mouseleave", () => {
    disableWillChange(element);
  });
}

/**
 * Optimizes multiple elements for hover animations
 * @param {NodeList|HTMLElement[]} elements - Elements to optimize
 * @param {string|string[]} properties - CSS properties that will change on hover
 */
export function optimizeMultipleForHover(elements, properties = ["transform"]) {
  for (const element of elements) {
    optimizeForHover(element, properties);
  }
}

/**
 * Debounced will-change management for frequently triggered events
 * @param {HTMLElement} element - The element to optimize
 * @param {string|string[]} properties - CSS properties that will change
 * @param {number} delay - Delay in milliseconds before removing optimization
 */
export function debouncedWillChange(element, properties, delay = 100) {
  let timeoutId;

  return function () {
    enableWillChange(element, properties);

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      disableWillChange(element);
    }, delay);
  };
}

/**
 * Check if reduced motion is preferred by the user
 * @returns {boolean} - True if user prefers reduced motion
 */
export function prefersReducedMotion() {
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Conditionally apply will-change based on user's motion preference
 * @param {HTMLElement} element - The element to optimize
 * @param {string|string[]} properties - CSS properties that will change
 */
export function respectiveWillChange(element, properties) {
  if (!prefersReducedMotion()) {
    enableWillChange(element, properties);
  }
}
