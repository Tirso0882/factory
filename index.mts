// What a project's `.factory/factory.config.mts` imports from `factory`.
// The reference gives an editor the Node types the factory's sources use,
// from wherever this package's dependencies are installed.

/// <reference types="node" />

export { defineFactory, pnpm, uv } from "./shared/factory.mts"
export type {
  Check,
  Effort,
  Env,
  FactoryConfig,
  Limits,
  ModelChoice,
  Mount,
  Names,
  Retries,
  Role,
  Timeouts,
  Toolchain,
  Workflow,
} from "./shared/factory.mts"
export type { SetupStep } from "./shared/setup.mts"
