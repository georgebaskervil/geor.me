import { ref } from "vue";

/**
 * Composable for task creation functionality
 * @param {Object} options
 * @param {Function} options.onCreate - Callback when a task is created
 * @returns {Object} Task creation methods and state
 */
export function useTaskCreation({ onCreate }) {
  const isAddingTask = ref(false);
  const newTaskLabel = ref("");
  const newTaskInput = ref(undefined);

  /**
   * Show the task creation form and focus the input
   */
  function showAddTaskForm() {
    isAddingTask.value = true;
    newTaskLabel.value = "";

    // Focus the input after DOM update
    setTimeout(() => {
      if (newTaskInput.value) {
        newTaskInput.value.focus();
      }
    }, 0);
  }

  /**
   * Submit a new task if valid
   */
  function submitNewTask() {
    if (newTaskLabel.value.trim()) {
      onCreate(newTaskLabel.value);
      isAddingTask.value = false;
      newTaskLabel.value = "";
    }
  }

  /**
   * Cancel task creation
   */
  function cancelNewTask() {
    isAddingTask.value = false;
    newTaskLabel.value = "";
  }

  return {
    isAddingTask,
    newTaskLabel,
    newTaskInput,
    showAddTaskForm,
    submitNewTask,
    cancelNewTask,
  };
}
