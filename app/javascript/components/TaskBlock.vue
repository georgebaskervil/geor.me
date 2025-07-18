<template>
  <div
    class="task-block"
    :class="{
      'most-important': index === 0,
      'is-dragging': isDragging,
    }"
  >
    <!-- Add the priority badge only when it's the top task -->
    <div v-if="index === 0" class="priority-badge">TOP PRIORITY</div>

    <div class="task-content">
      <span class="task-label">{{ task.label }}</span>
      <!-- Remove the wrapper div and go back to the original button -->
      <button
        class="control-btn pop-task-btn"
        title="Remove Task"
        @click.stop="$emit('remove')"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "TaskBlock",
  props: {
    task: {
      type: Object,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    totalTasks: {
      type: Number,
      required: true,
    },
    isDragging: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["remove"],
};
</script>
