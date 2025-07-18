<template>
  <div class="task-creator">
    <h2>Create New Task</h2>
    <div class="form-group">
      <label for="taskLabel">New Task:</label>
      <input
        id="taskLabel"
        v-model="taskLabel"
        type="text"
        placeholder="Enter task and press Enter"
        @keyup.enter="createTask"
      />
    </div>
    <button :disabled="!taskLabel" @click="createTask">Add to Stack</button>
  </div>
</template>

<script>
export default {
  name: "TaskCreator",
  emits: ["task-created"],
  data() {
    return {
      taskLabel: "",
    };
  },
  methods: {
    createTask() {
      if (this.taskLabel.trim()) {
        const newTask = {
          id: Date.now(),
          label: this.taskLabel,
        };
        this.$emit("task-created", newTask);
        this.taskLabel = "";
      }
    },
  },
};
</script>
