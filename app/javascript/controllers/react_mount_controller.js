import { Controller } from "@hotwired/stimulus";
import { assetLog } from "../utils/assetLoadLog.js";

const componentLoaders = {
  HomeControlPanel: () => import("../components/HomeControlPanel.jsx"),
  DeviceManagement: () => import("../components/DeviceManagement.jsx"),
};

export default class extends Controller {
  static values = {
    component: String,
    props: Object,
  };

  connect() {
    if (!this.hasComponentValue) return;
    this.disconnected = false;
    this._mountPromise = this.createApp();
  }

  disconnect() {
    this.disconnected = true;
    if (this.root) {
      this.root.unmount();
      this.root = undefined;
    }
  }

  propsValueChanged() {
    if (this.root) {
      this.disconnect();
      this.disconnected = false;
      this._mountPromise = this.createApp();
    }
  }

  async createApp() {
    const componentName = this.componentValue;
    const loadComponent = componentLoaders[componentName];

    if (!loadComponent) {
      console.error(`Component ${componentName} not found`);
      return;
    }

    const startedAt = performance.now();
    assetLog("React mount chunks load start", componentName);

    const [{ default: Component }, React, { createRoot }] = await Promise.all([
      loadComponent(),
      import("react"),
      import("react-dom/client"),
    ]);

    assetLog("React mount chunks ready", componentName, {
      ms: Math.round(performance.now() - startedAt),
    });

    if (this.disconnected) return;

    const properties = this.hasPropsValue ? this.propsValue : {};

    this.root = createRoot(this.element);
    this.root.render(React.createElement(Component, properties));
  }
}
