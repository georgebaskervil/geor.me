/**
 * @typedef {Object} TaskElement
 * @property {number} index - Index in the tasks array
 * @property {number|string} id - Task ID
 * @property {number} top - Top position relative to container
 * @property {number} bottom - Bottom position relative to container
 * @property {number} height - Element height
 * @property {HTMLElement} element - The DOM element
 */

/**
 * @typedef {Object} DropPosition
 * @property {number} index - Target index for insertion
 * @property {string} position - Position relative to target ("before"|"after"|"first")
 */

/**
 * Find the optimal drop position based on mouse position
 * @param {Array<TaskElement>} taskElements - Array of task element measurements
 * @param {number} mouseY - Current mouse Y position relative to container
 * @param {number} draggingIndex - Index of currently dragged item
 * @param {number} tasksLength - Total number of tasks
 * @returns {DropPosition} The determined drop position
 */
export function findDropPosition(taskElements, mouseY, draggingIndex) {
  // Handle empty list or invalid inputs case
  if (taskElements.length === 0 || mouseY === undefined) {
    return { index: 0, position: "first" };
  }

  // If there's only one item (which is being dragged), return a default
  if (taskElements.length === 1 && draggingIndex === 0) {
    return { index: 0, position: "first" };
  }

  // Keep track of all elements by their visual position
  const visibleElements = [];

  for (const [index, taskElement] of taskElements.entries()) {
    if (index !== draggingIndex) {
      visibleElements.push({
        ...taskElement,
        originalIndex: index, // Store original index
      });
    }
  }

  // Sort elements by their top position (visual order)
  visibleElements.sort((a, b) => a.top - b.top);

  // If mouse is above the first visible element
  if (
    visibleElements.length > 0 &&
    mouseY < visibleElements[0].top + visibleElements[0].height * 0.3
  ) {
    return { index: visibleElements[0].originalIndex, position: "before" };
  }

  // If mouse is below the last visible element
  if (
    visibleElements.length > 0 &&
    mouseY > visibleElements.at(-1).bottom - visibleElements.at(-1).height * 0.3
  ) {
    return {
      index: visibleElements.at(-1).originalIndex,
      position: "after",
    };
  }

  // Check each visible element to find where the mouse is positioned
  for (let index = 0; index < visibleElements.length; index++) {
    const current = visibleElements[index];

    // If this is the last element
    if (index === visibleElements.length - 1) {
      const middlePoint = current.top + current.height / 2;
      return mouseY < middlePoint
        ? { index: current.originalIndex, position: "before" }
        : { index: current.originalIndex, position: "after" };
    }

    // Check between this element and the next one
    const next = visibleElements[index + 1];

    // If mouse is in the current element's territory
    if (mouseY >= current.top && mouseY < current.top + current.height * 0.7) {
      return { index: current.originalIndex, position: "before" };
    }

    // If mouse is in the space between current and next element
    if (
      mouseY >= current.top + current.height * 0.7 &&
      mouseY < next.top + next.height * 0.3
    ) {
      return { index: current.originalIndex, position: "after" };
    }
  }

  // Fallback: find the closest element
  let closestElement = visibleElements[0];
  let closestDistance = Number.MAX_SAFE_INTEGER;

  for (const element of visibleElements) {
    const elementCenter = (element.top + element.bottom) / 2;
    const distance = Math.abs(mouseY - elementCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestElement = element;
    }
  }

  const elementMiddle = (closestElement.top + closestElement.bottom) / 2;
  const position = mouseY < elementMiddle ? "before" : "after";

  return { index: closestElement.originalIndex, position };
}

/**
 * Resolve drop position to final array index
 * @param {number} dragIndex - Current index being dragged
 * @param {DropPosition} dropPosition - Drop position data
 * @param {number} tasksLength - Total number of tasks
 * @returns {number} Final index for insertion
 */
export function resolveDropIndex(dragIndex, dropPosition, tasksLength) {
  // Start with the target index from the drop position
  let targetIndex = dropPosition.index;

  // If dropping after, increment the target index
  if (dropPosition.position === "after") {
    targetIndex++;
  }

  // Handle special case for empty list or first item position
  if (dropPosition.position === "first") {
    return 0;
  }

  // Adjust for the fact that we'll be removing the dragged item first
  if (dragIndex < targetIndex) {
    targetIndex--;
  }

  // Make sure the index is within bounds
  return Math.max(0, Math.min(targetIndex, tasksLength - 1));
}

/**
 * Calculate if a drag is significant enough to register
 * @param {Object} startPoint - Starting coordinates {x, y}
 * @param {Object} currentPoint - Current coordinates {x, y}
 * @param {number} threshold - Distance threshold in pixels
 * @returns {boolean} Whether drag distance exceeds threshold
 */
export function isDragSignificant(startPoint, currentPoint, threshold = 10) {
  if (!startPoint || !currentPoint) return false;

  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  const distance = Math.hypot(dx, dy);

  return distance >= threshold;
}
