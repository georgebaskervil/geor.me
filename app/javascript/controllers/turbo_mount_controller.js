import { Controller } from "@hotwired/stimulus";
import { createApp } from "vue";
import { assetLog } from "../utils/assetLoadLog.js";

const componentLoaders = {
  App: () => import("../components/TaskStackApp.vue"),
  TaskStack: () => import("../components/TaskStack.vue"),
  TaskBlock: () => import("../components/TaskBlock.vue"),
  TaskCreator: () => import("../components/TaskCreator.vue"),
  HomeControlPanel: () => import("../components/HomeControlPanel.jsx"),
  DeviceManagement: () => import("../components/DeviceManagement.jsx"),
  CursorFxWrapper: () => import("../components/CursorFxWrapper.vue"),
};

export default class extends Controller {
  static values = {
    component: String,
    props: Object,
  };

  connect() {
    if (!this.hasComponentValue) return;
    this.disconnected = false;
    this._mountPromise = this.mountComponent();
  }

  disconnect() {
    this.disconnected = true;
    if (this.app) {
      this.app.unmount();
      this.app = undefined;
    }
  }

  propsValueChanged() {
    if (this.app) {
      this.disconnect();
      this.disconnected = false;
      this._mountPromise = this.mountComponent();
    }
  }

  async mountComponent() {
    const componentName = this.componentValue;
    const loadComponent = componentLoaders[componentName];

    if (!loadComponent) {
      console.error(`Component ${componentName} not found`);
      return;
    }

    const startedAt = performance.now();
    assetLog("Vue mount chunk load start", componentName);

    const { default: Component } = await loadComponent();

    assetLog("Vue mount chunk ready", componentName, {
      ms: Math.round(performance.now() - startedAt),
    });

    if (this.disconnected) return;

    const properties = this.hasPropsValue ? this.propsValue : {};

    this.app = createApp(Component, properties);
    this.app.mount(this.element);
  }
}
