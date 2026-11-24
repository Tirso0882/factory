// The `factory` command end to end, in a throwaway repo with no node_modules:
// it loads the project's config, whose `factory` import is the CLI itself.

import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, describe, it } from "node:test"
import { factoryVersion } from "../shared/load-factory.mts"

const BIN = join(import.meta.dirname, "factory.mjs")
const dirs: string[] = []
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })))

/** An empty git repo. */
const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), "factory-cli-"))
  dirs.push(dir)
  execFileSync("git", ["init", "--quiet", dir])
  return dir
}

/** A git repo whose `.factory/factory.config.mts` is `config`. */
const project = (config: string) => {
  const dir = repo()
  mkdirSync(join(dir, ".factory"))
  writeFileSync(join(dir, ".factory/factory.config.mts"), config)
  return dir
}

const factory = (cwd: string, ...args: string[]) =>
  spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8" })

const configFor = (version: string) => `
import { defineFactory, type Check } from "factory"

const lint: Check = { name: "lint", command: "true" }

export default defineFactory({ version: ${JSON.stringify(version)}, checks: [lint] })
`

describe("the factory command", () => {
  it("loads a config that imports from factory, in a repo with no node_modules", () => {
    const dir = project(configFor(`^${factoryVersion()}`))
    // The options are checked once the config has loaded and resolved.
    const run = factory(dir, "check", "--nope")
    assert.equal(run.status, 1)
    assert.match(run.stderr, /factory check takes only --quick, got --nope\./)
  })

  it("stops when the CLI is outside the config's version range", () => {
    const dir = project(configFor("^99.0.0"))
    const run = factory(dir, "check", "--quick")
    assert.equal(run.status, 1)
    assert.match(run.stderr, /needs factory \^99\.0\.0, but .* is installed/)
    assert.match(run.stderr, /npm install -g "@tirso0882\/factory@\^99\.0\.0"/)
  })

  it("names the range when a config for a newer CLI won't even load", () => {
    const dir = project(`
import { defineFactory, fromTheFuture } from "factory"
export default defineFactory({ version: "^99.0.0", toolchains: [fromTheFuture()] })
`)
    const run = factory(dir, "check")
    assert.equal(run.status, 1)
    assert.match(run.stderr, /needs factory \^99\.0\.0, but .* is installed/)
  })

  it("names the missing config", () => {
    const run = factory(repo(), "check")
    assert.equal(run.status, 1)
    assert.match(run.stderr, /has no \.factory\/factory\.config\.mts/)
  })

  it("prints its version anywhere", () => {
    const run = factory(tmpdir(), "--version")
    assert.equal(run.stdout.trim(), factoryVersion())
  })
})
