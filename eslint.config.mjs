// Lints the factory: `npm run lint`. Types are `npm run typecheck`'s job, so
// only the rules that need no type information.
import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  { ignores: ["node_modules/", ".sandcastle/", ".factory/logs/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      // `let { a, b } = ...` where only one of them is reassigned.
      "prefer-const": ["error", { destructuring: "all" }],
    },
  },
])
