import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import vuePlugin from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// Get Vue and Prettier configs from existing .eslintrc-compatible configs
const compatConfigs = compat.extends("plugin:vue/vue3-recommended", "prettier");

export default [
  {
    ignores: [
      "app//builds**",
      "**/node_modules/",
      "**/vendor/",
      "**/tmp/",
      "**.config.js",
      "public/**",
      "app//libs/**",
    ],
  },
  // Include standard configs
  js.configs.recommended,
  unicorn.configs.recommended,
  // Include compatibility configs
  ...compatConfigs,
  {
    // Define plugins only once
    plugins: {
      vue: vuePlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      ecmaVersion: "latest",
      sourceType: "module",
      parser: vueParser, // Set Vue's parser
    },
    // Our custom rules
    rules: {
      "unicorn/filename-case": "off",
      "unicorn/no-anonymous-default-export": "off",
      "unicorn/no-empty-file": "off",
    },
  },
];
