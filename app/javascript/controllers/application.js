import { Application } from "@hotwired/stimulus";
const application = Application.start();
application.debug = false;
globalThis.Stimulus = application;

// TurboMount integration
import { TurboMount } from "turbo-mount";
import { registerComponents } from "turbo-mount/registerComponents/vite"; // Correct path for Vite integration

const turboMount = new TurboMount();

// Auto-register components with Vite
const components = import.meta.glob("../components/**/*.vue", { eager: true });
registerComponents({ turboMount, components });

export { application };
