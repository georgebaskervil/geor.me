<template>
  <div class="app-container">
    <h1 class="taskstack-h1">Task Stack</h1>
    <p class="taskstack-p">A Todo app I made custom for the way that I work.</p>
    <div class="main-content">
      <TaskStack
        :tasks="tasks"
        @remove-task="removeTask"
        @reorder-tasks="reorderTasks"
        @create-task="createTask"
      />
    </div>
  </div>
</template>

<script>
import TaskStack from "./TaskStack.vue";

export default {
  name: "App",
  components: {
    TaskStack,
  },
  data() {
    return {
      tasks: [],
    };
  },
  created() {
    // Load tasks from localStorage when the app starts
    const savedTasks = localStorage.getItem("stackTasks");
    if (savedTasks) {
      this.tasks = JSON.parse(savedTasks);
    }
  },
  methods: {
    createTask(taskLabel) {
      const newTask = {
        id: Date.now(),
        label: taskLabel,
      };
      this.tasks.unshift(newTask);
      this.saveToLocalStorage();
    },
    removeTask(index) {
      this.tasks.splice(index, 1);
      this.saveToLocalStorage();
    },
    reorderTasks(newOrder) {
      this.tasks = newOrder;
      this.saveToLocalStorage();
    },
    saveToLocalStorage() {
      localStorage.setItem("stackTasks", JSON.stringify(this.tasks));
    },
  },
};
</script>
