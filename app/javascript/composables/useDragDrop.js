import { ref, onBeforeUnmount } from "vue";

/**
 * Improved drag and drop with Trello-like visual effects
 * @param {Object} options Options object
 * @param {Function} options.onReorder Callback when items are reordered
 * @returns {Object} Drag and drop functionality
 */
export function useDragDrop({ onReorder }) {
  // Track container element
  const containerReference = ref(undefined);

  // Currently dragging state
  const dragging = ref(false);
  const draggedElement = ref(undefined);
  const draggedIndex = ref(-1);
  const placeholderElement = ref(undefined);

  // State for drag position with better tracking
  const dragStartPosition = ref({ x: 0, y: 0 });
  const mouseOffset = ref({ x: 0, y: 0 });
  const scrollPosition = ref({ x: 0, y: 0 });

  // Trello-like effect variables
  const rotationFactor = 4; // Maximum rotation in degrees
  const scaleFactor = 1.05; // Scale factor while dragging

  /**
   * Handle drag start event
   * @param {Event} event Mouse event
   * @param {Number} index Item index
   */
  function handleDragStart(event, index) {
    // Ignore button clicks
    if (event.target.closest("button")) return;

    event.preventDefault();

    // Get target element and its dimensions
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();

    // Record scroll position at start of drag
    scrollPosition.value = {
      x: window.scrollX,
      y: window.scrollY,
    };

    // Create a placeholder element to maintain space
    const placeholder = document.createElement("div");
    placeholder.className = "drag-placeholder";
    placeholder.style.height = `${rect.height}px`;
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.margin = "5px 0"; // Match stack-item margin
    placeholder.style.visibility = "hidden";
    placeholder.style.pointerEvents = "none"; // Don't interfere with mouse events

    // Insert placeholder before we modify the element
    element.parentNode.insertBefore(placeholder, element);
    placeholderElement.value = placeholder;

    // Store container position
    const containerRect = containerReference.value.getBoundingClientRect();

    // Set dragging state
    dragging.value = true;
    draggedElement.value = element;
    draggedIndex.value = index;

    // Store start position in page coordinates and container position for reference
    dragStartPosition.value = {
      x: event.clientX,
      y: event.clientY,
      containerTop: containerRect.top,
      containerLeft: containerRect.left,
    };

    // Calculate mouse pointer offset from element top-left corner
    mouseOffset.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Prepare element for dragging with absolute positioning
    element.style.zIndex = "1000";
    // Use fixed positioning to avoid scroll issues
    element.style.position = "fixed";
    // Set initial position exactly where the element was
    element.style.top = `${rect.top}px`;
    element.style.left = `${rect.left}px`;
    element.style.width = `${rect.width}px`; // Maintain width
    element.style.margin = "0"; // Remove margins
    element.style.transition = "none"; // Remove transition during drag
    element.style.willChange = "transform, box-shadow"; // Enable optimization for drag

    // Apply initial Trello-like transform with rotation and scale
    element.style.transform = `rotate(${rotationFactor / 2}deg) scale(${scaleFactor})`;
    element.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.4)";
    element.style.transformOrigin = "center center";

    element.classList.add("is-dragging"); // Add class for styling

    // Add event listeners for drag operation
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);

    // Add dragging class to body for cursor changes
    document.body.classList.add("dragging");
  }

  /**
   * Handle drag movement
   * @param {Event} event Mouse event
   */
  function handleDragMove(event) {
    if (!dragging.value || !draggedElement.value) return;

    const element = draggedElement.value;

    // Calculate new position directly from mouse position minus the original offset
    const newX = event.clientX - mouseOffset.value.x;
    const newY = event.clientY - mouseOffset.value.y;

    // Calculate horizontal movement relative to starting position to determine rotation
    const moveX = event.clientX - dragStartPosition.value.x;

    // Calculate dynamic rotation based on horizontal movement (with limit)
    const rotation = Math.min(
      Math.max(-rotationFactor, moveX / 20),
      rotationFactor,
    );

    // Apply position using fixed positioning with Trello-like rotation and scale
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
    element.style.transform = `rotate(${rotation}deg) scale(${scaleFactor})`;

    // Find target position and update drop indicators
    updateDropTarget(event.clientY);
  }

  /**
   * Find the drop target based on mouse position
   * @param {Number} mouseY Y-coordinate of mouse
   */
  function updateDropTarget(mouseY) {
    if (!containerReference.value || draggedIndex.value < 0) return;

    // Clear existing drop markers
    const existingMarkers =
      containerReference.value.querySelectorAll(".drop-indicator");
    for (const marker of existingMarkers) marker.remove();

    // Get all draggable items
    const items = [
      ...containerReference.value.querySelectorAll(".draggable-item"),
    ];
    if (items.length <= 1) return; // No need to calculate if only one item

    // Find the target position
    let targetIndex = -1;
    let insertBefore = false;

    // Check each item's position
    for (const [index, item] of items.entries()) {
      if (index === draggedIndex.value) continue; // Skip the dragged item

      const rect = item.getBoundingClientRect();
      const middle = rect.top + rect.height / 2;

      if (mouseY < middle) {
        targetIndex = index;
        insertBefore = true;
        break;
      }
    }

    // If no target found yet, add to end
    if (targetIndex === -1) {
      targetIndex = items.length - 1;
      insertBefore = false;
    }

    // Don't show indicator if dropping at original position
    if (
      targetIndex === draggedIndex.value ||
      (targetIndex === draggedIndex.value - 1 && !insertBefore) ||
      (targetIndex === draggedIndex.value + 1 && insertBefore)
    ) {
      return;
    }

    // Add drop indicator
    const indicator = document.createElement("div");
    indicator.className = "drop-indicator";
    indicator.setAttribute("role", "presentation"); // For a11y

    // Animate the indicator for better visibility
    indicator.style.cssText = `
            height: 4px;
            background: #c39399;
            border-radius: 2px;
            margin: 8px 0;
            animation: pulse 1.5s infinite;
            box-shadow: 0 0 8px rgba(195, 147, 153, 0.6);
            opacity: 0.8;
            will-change: opacity, transform;
        `;

    // Add data attributes for drop operation
    indicator.dataset.targetIndex = targetIndex;
    indicator.dataset.insertBefore = insertBefore;

    // Insert indicator at correct position
    if (insertBefore) {
      if (items[targetIndex]?.parentNode) {
        items[targetIndex].parentNode.insertBefore(
          indicator,
          items[targetIndex],
        );
      }
    } else {
      if (items[targetIndex]?.nextSibling) {
        items[targetIndex].parentNode.insertBefore(
          indicator,
          items[targetIndex].nextSibling,
        );
      } else if (items[targetIndex]?.parentNode) {
        items[targetIndex].parentNode.append(indicator);
      }
    }
  }

  /**
   * Handle drag end and reorder
   */
  function handleDragEnd() {
    if (!dragging.value || !draggedElement.value) return;

    // Find drop target
    const indicator =
      containerReference.value?.querySelector(".drop-indicator");
    let needsReorder = false;
    let fromIndex = draggedIndex.value;
    let toIndex = fromIndex;

    if (indicator && draggedIndex.value >= 0) {
      const targetIndex = Number(indicator.dataset.targetIndex);
      const insertBefore = indicator.dataset.insertBefore === "true";

      // Calculate final insertion index
      toIndex = insertBefore ? targetIndex : targetIndex + 1;

      // Adjust index if we're moving an item to a later position
      if (fromIndex < toIndex) {
        toIndex--;
      }

      // Only reorder if position changed
      needsReorder = fromIndex !== toIndex;
    }

    // Get the element being dragged
    const element = draggedElement.value;

    // Store the original position where the element should return to
    const originalPosition = dragStartPosition.value;

    // Clear existing drop indicators (do this first for cleaner animation)
    const indicators = document.querySelectorAll(".drop-indicator");
    for (const indicator of indicators) indicator.remove();

    // Add smooth transition for returning to origin
    element.style.transition = "all 0.3s cubic-bezier(0.2, 0.6, 0.35, 1)";

    // Move back to original position first - reset rotation and scale
    element.style.left = `${originalPosition.x}px`;
    element.style.top = `${originalPosition.y}px`;
    element.style.transform = "rotate(0deg) scale(1)";
    element.style.boxShadow = "";

    // After the element returns to its original position, perform the reordering
    setTimeout(() => {
      // Clear fixed positioning to let the normal document flow take over
      element.style.position = "";
      element.style.top = "";
      element.style.left = "";
      element.style.width = "";
      element.style.margin = "";
      element.style.zIndex = "";
      element.style.transform = "";
      element.classList.remove("is-dragging");

      // Remove the placeholder
      if (placeholderElement.value && placeholderElement.value.parentNode) {
        placeholderElement.value.remove();
        placeholderElement.value = undefined;
      }

      // Now perform the actual reordering with another slight delay
      // This creates the nice sequence of animations
      if (needsReorder) {
        setTimeout(() => {
          onReorder(fromIndex, toIndex);
        }, 50); // Small delay before reordering
      }

      // Reset dragging state variables
      dragging.value = false;
      draggedElement.value = undefined;
      draggedIndex.value = -1;

      // Reset position trackers
      dragStartPosition.value = { x: 0, y: 0 };
      mouseOffset.value = { x: 0, y: 0 };
      scrollPosition.value = { x: 0, y: 0 };
    }, 300); // Match the transition duration

    // Remove event listeners
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);

    // Remove body class
    document.body.classList.remove("dragging");
  }

  /**
   * Clean up after drag operation
   */
  function cleanupDragOperation() {
    // Clear drop indicators
    const indicators = document.querySelectorAll(".drop-indicator");
    for (const indicator of indicators) indicator.remove();

    // If there's a placeholder, remove it
    if (placeholderElement.value && placeholderElement.value.parentNode) {
      placeholderElement.value.remove();
      placeholderElement.value = undefined;
    }

    // If there's a dragged element, reset its styles
    if (draggedElement.value) {
      const element = draggedElement.value;
      element.style.position = "";
      element.style.top = "";
      element.style.left = "";
      element.style.width = "";
      element.style.margin = "";
      element.style.zIndex = "";
      element.style.willChange = ""; // Remove will-change optimization
      element.classList.remove("is-dragging");
    }

    // Reset dragging state
    dragging.value = false;
    draggedElement.value = undefined;
    draggedIndex.value = -1;

    // Reset position trackers
    dragStartPosition.value = { x: 0, y: 0 };
    mouseOffset.value = { x: 0, y: 0 };
    scrollPosition.value = { x: 0, y: 0 };
  }

  // Clean up on unmount
  onBeforeUnmount(() => {
    cleanupDragOperation();
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  });

  return {
    containerRef: containerReference,
    dragging,
    handleDragStart,
    cleanupDragOperation,
  };
}
