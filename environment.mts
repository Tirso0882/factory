// The sandbox environment: what an agent's sandbox can see and reach.
//
// The sandbox is the host's native one, picked on every run (see
// shared/native-sandbox.mts): bwrap on Linux and WSL2, seatbelt on macOS 14
// and later. Either gives each sandbox a private, empty home directory. That
// hides the package caches, so the project's toolchains mount them back in,
// and it means nothing from the repo's `.env` is ever there: the sandbox gets
// only the variables the project declares and the tokens in
// `~/.config/factory/.env` and `.factory/.env` (shared/agent-env.mts). Never
// copy `.env` into a worktree.
//
// What a sandbox gets comes from `.factory/factory.config.mts`, resolved in
// shared/factory.mts. Check it without spending tokens:
//   factory check

import { execFileSync } from "node:child_process"
import { release } from "node:os"
import type { Sandbox, SandboxProvider } from "@ai-hero/sandcastle"
import { type BwrapOptions, bwrap } from "@ai-hero/sandcastle/sandboxes/bwrap"
import {
  type SeatbeltOptions,
  seatbelt,
} from "@ai-hero/sandcastle/sandboxes/seatbelt"
import type { ResolvedFactory } from "./shared/factory.mts"
import {
  type NativeSandbox,
  chooseNativeSandbox,
} from "./shared/native-sandbox.mts"
import { runSetupSteps } from "./shared/setup.mts"

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const compose = (factory: ResolvedFactory, ...args: string[]) => {
  if (factory.services === undefined) return
  execFileSync(
    "docker",
    ["compose", "-f", factory.services.composeFile, ...args],
    { stdio: ["ignore", "inherit", "inherit"] }
  )
}

/** Start the project's services, if it has any, and wait until they're
 *  ready. */
export const startServices = (factory: ResolvedFactory) =>
  compose(factory, "up", "--detach", "--wait")

/** Remove them, with their data. */
export const stopServices = (factory: ResolvedFactory) =>
  compose(factory, "down", "--volumes")

// ---------------------------------------------------------------------------
// The sandbox
// ---------------------------------------------------------------------------

/** This host's native sandbox. It throws, naming the supported hosts, on one
 *  that has none: the factory never runs an agent unsandboxed. */
export const hostSandbox = () =>
  chooseNativeSandbox({ platform: process.platform, release: release() })

/** What both native sandboxes take. */
type SandboxOptions = BwrapOptions & SeatbeltOptions

const PROVIDERS = { bwrap, seatbelt } satisfies Record<
  NativeSandbox,
  (options: SandboxOptions) => SandboxProvider
>

/**
 * The host's sandbox with the project's mounts and its variables for `slot`.
 *
 * `slot` separates sandboxes that run at the same time: 0 for a run with no
 * parallel peer (the planner, preflight), 1 up for the parallel ones. The
 * project's `env(slot)` decides what a slot changes, such as a Redis database.
 */
export const sandbox = (factory: ResolvedFactory, slot = 0) => {
  const options: SandboxOptions = {
    mounts: factory.sandbox.mounts,
    env: { ...factory.sandbox.env(slot), ...factory.agentEnv.values },
  }
  return PROVIDERS[hostSandbox()](options)
}

/** Make a fresh sandbox fit for an agent: the toolchains' installs, the
 *  skill links and the project's setup steps (see shared/setup.mts). */
export const setUpSandbox = (
  factory: ResolvedFactory,
  box: Pick<Sandbox, "exec">
) => runSetupSteps(box, factory.sandbox.setup)
