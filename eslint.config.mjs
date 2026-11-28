// Lints the factory: `npm run lint`. Types are `npm run typecheck`'s job, so
// only the rules that need no type information, and the repo's own rules.
import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

/** The repo's own rules, for what the coding standards ask of every file. */
const factory = {
  rules: {
    "header-comment": {
      meta: {
        type: "suggestion",
        messages: {
          missing:
            "Start the file with a comment that says what it is for (.factory/standards.md).",
        },
        schema: [],
      },
      create: (context) => ({
        Program: (program) => {
          // A shebang is the one line allowed above the header, and isn't it.
          const first = context.sourceCode
            .getAllComments()
            .find((comment) => comment.type !== "Shebang")
          const code = program.body[0]
          if (!first || (code && code.range[0] < first.range[0])) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: "missing",
            })
          }
        },
      }),
    },
  },
}

export default defineConfig([
  { ignores: ["node_modules/", ".sandcastle/", ".factory/logs/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    plugins: { factory },
    rules: {
      // `let { a, b } = ...` where only one of them is reassigned.
      "prefer-const": ["error", { destructuring: "all" }],
    },
  },
  {
    // Test files may start with their imports: their names say what they test.
    files: ["**/*.mts", "**/*.mjs"],
    ignores: ["**/*.test.mts"],
    rules: { "factory/header-comment": "error" },
  },
])
