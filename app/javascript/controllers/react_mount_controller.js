import { Controller } from "@hotwired/stimulus";
import React from "react";
import { createRoot } from "react-dom/client";
import HomeControlPanel from "../components/HomeControlPanel.jsx";
import DeviceManagement from "../components/DeviceManagement.jsx";

const components = {
  HomeControlPanel,
  DeviceManagement,
};

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
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  propsValueChanged() {
    if (this.root) {
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

    this.root = createRoot(this.element);
    this.root.render(React.createElement(Component, properties));
  }
}
