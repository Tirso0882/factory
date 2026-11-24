// What a project's `.factory/factory.config.mts` imports from `factory`.

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
