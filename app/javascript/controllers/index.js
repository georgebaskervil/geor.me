import { registerLazyControllers } from "./lazy_register";

const lazyControllers = import.meta.glob("./**/*_controller.{js,coffee}", {
  eager: false,
});

registerLazyControllers(lazyControllers);
