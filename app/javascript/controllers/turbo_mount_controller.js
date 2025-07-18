import { Controller } from "@hotwired/stimulus";
import { createApp } from "vue";
import * as components from "../components";

export default class extends Controller {
  static values = {
    component: String,
    props: Object,
  };

  connect() {
    if (!this.hasComponentValue) return;
    this.createApp();
  }

  disconnect() {
    if (this.app) {
      this.app.unmount();
      this.app = undefined;
    }
  }

  propsValueChanged() {
    if (this.app) {
      this.disconnect();
      this.createApp();
    }
  }

  createApp() {
    const componentName = this.componentValue;
    const Component = components[componentName];

    if (!Component) {
      console.error(`Component ${componentName} not found`);
      return;
    }

    const properties = this.hasPropsValue ? this.propsValue : {};

    // Mount the component directly instead of using a render function
    this.app = createApp(Component, properties);
    this.app.mount(this.element);
  }
}
