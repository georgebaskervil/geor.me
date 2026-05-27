import { Application } from "@hotwired/stimulus";
const application = Application.start();
application.debug = false;
globalThis.Stimulus = application;

export { application };
