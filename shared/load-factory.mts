// Reads a project's `.factory/factory.config.mts` and resolves it for this
// host (see factory.mts). The config's `factory` import is the CLI itself
// (bin/factory.mjs), so the project needs no Node tooling of its own.

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, realpathSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import {
  type FactoryConfig,
  type Host,
  type ResolvedFactory,
  checkVersion,
  resolveFactory,
} from "./factory.mts"

export const CONFIG_PATH = ".factory/factory.config.mts"

/** The version of the CLI that runs, from its package.json. */
export const factoryVersion = (): string =>
  (
    JSON.parse(
      readFileSync(join(import.meta.dirname, "../package.json"), "utf8")
    ) as { version: string }
  ).version

/** The machine this runs on. Commands run only when a toolchain asks. */
const realHost = (repoRoot: string): Host => ({
  repoRoot,
  factoryVersion: factoryVersion(),
  home: homedir(),
  env: process.env,
  exists: existsSync,
  realPath: realpathSync,
  read: (path) => readFileSync(path, "utf8"),
  output: ([command, ...args]) =>
    execFileSync(command, args, { encoding: "utf8" }).trim(),
})

/** The settings of the project at `repoRoot`, resolved for this host. */
export const loadFactory = async (
  repoRoot: string
): Promise<ResolvedFactory> => {
  const path = join(repoRoot, CONFIG_PATH)
  if (!existsSync(path)) {
    throw new Error(`${repoRoot} has no ${CONFIG_PATH}.`)
  }
  let module: { default?: FactoryConfig }
  try {
    module = (await import(pathToFileURL(path).href)) as typeof module
  } catch (error) {
    // A config for a newer CLI may import what this one lacks, so it fails
    // before resolveFactory can check its range: look for the range in its
    // text, so the error says which version to install.
    const range = /\bversion\s*:\s*["'`]([^"'`]+)["'`]/u.exec(
      readFileSync(path, "utf8")
    )?.[1]
    try {
      checkVersion(range, factoryVersion())
    } catch (versionError) {
      // The cause is the failed import, which the version error explains.
      // eslint-disable-next-line preserve-caught-error
      throw new Error((versionError as Error).message, { cause: error })
    }
    throw error
  }
  if (module.default === undefined) {
    throw new Error(
      `${CONFIG_PATH} must \`export default defineFactory({...})\`.`
    )
  }
  return resolveFactory(module.default, realHost(repoRoot))
}
