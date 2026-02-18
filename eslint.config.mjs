// @ts-check

import reactHooks from "eslint-plugin-react-hooks";

import eslint from "@eslint/js";
import pluginRouter from "@tanstack/eslint-plugin-router";
import jsxA11y from "eslint-plugin-jsx-a11y";
import unicornPlugin from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/routeTree.gen.ts"],
  },
  reactHooks.configs.flat.recommended,
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  jsxA11y.flatConfigs.recommended,
  unicornPlugin.configs.recommended,
  pluginRouter.configs["flat/recommended"],

  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "react-hooks/incompatible-library": "off",
      // JSX a11y rules
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/no-autofocus": "off",
      // Unicorn rules
      "unicorn/expiring-todo-comments": "off",
      "unicorn/filename-case": "off",
      "unicorn/no-array-callback-reference": "off",
      "unicorn/no-document-cookie": "off",
      "unicorn/no-nested-ternary": "off",
      "unicorn/no-null": "off",
      "unicorn/no-typeof-undefined": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/prefer-ternary": "off",
      "unicorn/prevent-abbreviations": "off",
    },
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-empty-function": [
        "error",
        {
          allow: ["arrowFunctions", "functions", "methods"],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
