import { Controller } from "@hotwired/stimulus";
import * as THREE from "three";
/* global emulators */
import "emulators";
import spaceTexture from "~/images/space.png";
import doomFiles from "~/libs/doom_shareware.jsdos";

// Connects to data-controller="doom-cube"
export default class extends Controller {
  static targets = ["root", "canvas"];

  connect() {
    // Only set up event listener initially
    document.addEventListener(
      "distractionmode:toggle",
      this.handleDistractionMode.bind(this),
    );
  }

  handleDistractionMode(event) {
    if (event.detail.enabled) {
      if (this.initialized) {
        this.resumeEmulator();
      } else {
        this.initializeDoomCube();
      }
    } else {
      this.pauseEmulator();
    }
  }

  initializeDoomCube() {
    this.initialized = true;

    // Move all initialization code here
    this.textureCanvas = document.createElement("canvas");
    this.textureCanvas.width = 320;
    this.textureCanvas.height = 200;
    this.ctx = this.textureCanvas.getContext("2d");
    const texture = new THREE.CanvasTexture(this.textureCanvas);

    // Create scene, camera, and renderer using the existing canvas
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 548 / 308, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasTarget });
    this.renderer.setSize(548, 308);

    // Load background sphere
    const sphereGeometry = new THREE.SphereGeometry(5, 120, 80);
    sphereGeometry.scale(-1, 1, 1);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load(spaceTexture),
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.scene.add(sphere);

    // Create a rotating cube
    const geometry = new THREE.BoxGeometry(1.45, 1.45, 1.45);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    // Position the camera
    this.camera.position.z = 2;
    this.camera.updateProjectionMatrix();

    this.isAnimating = true;
    this.animate();
    this.runEmulator(texture);
  }

  animate() {
    if (this.isAnimating) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
      this.cube.rotation.x += 0.01;
      this.cube.rotation.y += 0.01;
      this.renderer.render(this.scene, this.camera);
    }
  }

  async runEmulator(texture) {
    try {
      const bundle = await fetch(doomFiles);
      const arrayBuffer = await bundle.arrayBuffer();
      const array = new Uint8Array(arrayBuffer);

      this.ci = await emulators.dosWorker(array);
      const rgba = new Uint8ClampedArray(320 * 200 * 4);

      this.ci.events().onFrame((rgb) => {
        for (let next = 0; next < 320 * 200; ++next) {
          rgba[next * 4 + 0] = rgb[next * 3 + 0];
          rgba[next * 4 + 1] = rgb[next * 3 + 1];
          rgba[next * 4 + 2] = rgb[next * 3 + 2];
          rgba[next * 4 + 3] = 255;
        }

        this.ctx?.putImageData(new ImageData(rgba, 320, 200), 0, 0);
        texture.needsUpdate = true;
      });

      this.handleKeyEvents(true);
    } catch (error) {
      console.error("Failed to run emulator:", error);
    }
  }

  handleKeyEvents(enable) {
    if (enable) {
      this.keyDownHandler = (event_) => {
        this.ci.sendKeyEvent(event_.keyCode, true);
      };
      this.keyUpHandler = (event_) => {
        this.ci.sendKeyEvent(event_.keyCode, false);
      };
      globalThis.addEventListener("keydown", this.keyDownHandler);
      globalThis.addEventListener("keyup", this.keyUpHandler);
    } else {
      globalThis.removeEventListener("keydown", this.keyDownHandler);
      globalThis.removeEventListener("keyup", this.keyUpHandler);
    }
  }

  pauseEmulator() {
    if (this.ci && this.ci.emulator) {
      this.ci.emulator.config.emuSpeed = 0; // Pause the emulator
    }
    this.isAnimating = false; // Stop animation loop
    cancelAnimationFrame(this.animationFrame);
    this.handleKeyEvents(false); // Remove key event listeners
  }

  resumeEmulator() {
    if (this.ci && this.ci.emulator) {
      this.ci.emulator.config.emuSpeed = 1; // Resume the emulator
    }
    this.isAnimating = true; // Restart animation loop
    this.animate();
    this.handleKeyEvents(true); // Reattach key event listeners
  }

  disconnect() {
    this.pauseEmulator();
    if (this.ci && this.ci.destroy) {
      this.ci.destroy(); // Clean up emulator instance
    }
  }
}
