import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import globals from "globals";

const compat = new FlatCompat({
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...compat.extends("eslint:recommended"),
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 8,
        sourceType: "module"
      },
      globals: globals.node
    },
    rules: {
      "max-len": ["error", 100],
      semi: "error",
      "no-tabs": "error",
      "no-console": "off",
      "no-constant-condition": "off",
      "no-unused-vars": ["error", { caughtErrorsIgnorePattern: "ignore" }]
    }
  }
];
