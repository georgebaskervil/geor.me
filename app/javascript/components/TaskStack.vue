<template>
  <div class="task-stack-container">
    <!-- Task Creation Form -->
    <div class="add-task-container">
      <template v-if="isAddingTask">
        <div class="add-task-form">
          <input
            ref="newTaskInput"
            v-model="newTaskLabel"
            type="text"
            placeholder="Enter task name..."
            class="taskstack-input add-task-input"
            @keyup.enter="submitNewTask"
            @keyup.esc="cancelNewTask"
          />
          <div class="add-task-actions">
            <button
              :disabled="!newTaskLabel.trim()"
              class="taskstack-button add-task-button"
              @click="submitNewTask"
            >
              Add
            </button>
            <button
              class="taskstack-button cancel-task-button"
              @click="cancelNewTask"
            >
              Cancel
            </button>
          </div>
        </div>
      </template>
      <button
        v-else
        class="taskstack-button add-task-button"
        @click="showAddTaskForm"
      >
        <span class="add-icon">+</span> New Task
      </button>
    </div>

    <!-- Task Stack using simpler drag and drop -->
    <div ref="containerRef" class="task-stack-container-inner">
      <transition-group
        v-if="tasks.length > 0"
        name="task-list"
        tag="div"
        class="task-stack"
      >
        <!-- Task items -->
        <div
          v-for="(task, index) in tasks"
          :key="task.id"
          class="stack-item draggable-item"
          :data-task-id="task.id"
          @mousedown="handleDragStart($event, index)"
        >
          <!-- Remove the most-important class from here, it's handled in TaskBlock -->
          <TaskBlock
            :task="task"
            :index="index"
            :total-tasks="tasks.length"
            :is-dragging="false"
            @remove="$emit('remove-task', index)"
          />
        </div>
      </transition-group>

      <!-- Empty state -->
      <div v-else class="empty-stack">
        <div class="empty-stack-message">Stack is empty. Add some tasks!</div>
      </div>
    </div>
  </div>
</template>

<script>
import TaskBlock from "./TaskBlock.vue";
import { useTaskCreation } from "../composables/useTaskCreation";
import { useDragDrop } from "../composables/useDragDrop";

export default {
  name: "TaskStack",
  components: {
    TaskBlock,
  },
  props: {
    tasks: {
      type: Array,
      required: true,
    },
    debug: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["remove-task", "create-task", "reorder-tasks"],
  setup(properties, { emit }) {
    // Set up task creation functionality
    const {
      isAddingTask,
      newTaskLabel,
      newTaskInput,
      showAddTaskForm,
      submitNewTask,
      cancelNewTask,
    } = useTaskCreation({
      onCreate: (label) => emit("create-task", label),
    });

    // Set up simpler drag and drop
    const { containerRef, dragging, handleDragStart, cleanupDragOperation } =
      useDragDrop({
        onReorder: (fromIndex, toIndex) => {
          // Create a new array with the reordered items
          const newOrder = [...properties.tasks];
          const [removed] = newOrder.splice(fromIndex, 1);
          newOrder.splice(toIndex, 0, removed);
          emit("reorder-tasks", newOrder);
        },
      });

    // Return everything needed by the template
    return {
      // Task creation
      isAddingTask,
      newTaskLabel,
      newTaskInput,
      showAddTaskForm,
      submitNewTask,
      cancelNewTask,

      // Drag and drop
      containerRef,
      dragging,
      handleDragStart,
      cleanupDragOperation,
    };
  },
};
</script>
