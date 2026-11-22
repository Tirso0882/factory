#!/usr/bin/env node
// The `factory` command. The factory is TypeScript, and so is a project's
// `.factory/factory.config.mts`: tsx loads both. The config's `factory` import
// resolves to this package, so the project needs no node_modules of its own.

import { registerHooks } from "node:module"
import { register } from "tsx/esm/api"

const API = new URL("../index.mts", import.meta.url).href

registerHooks({
  resolve: (specifier, context, nextResolve) =>
    specifier === "factory"
      ? { url: API, format: "module", shortCircuit: true }
      : nextResolve(specifier, context),
})
register()

await import("../cli.mts")
