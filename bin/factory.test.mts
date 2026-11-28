// The `factory` command end to end, in a throwaway repo with no node_modules:
// it loads the project's config, whose `factory` import is the CLI itself.

import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, describe, it } from "node:test"
import { factoryVersion } from "../shared/load-factory.mts"

const BIN = join(import.meta.dirname, "factory.mjs")
const TSC = join(import.meta.dirname, "../node_modules/typescript/bin/tsc")

/** Type-check a project as an editor would, from the project's folder. */
const tsc = (tsconfig: string) =>
  spawnSync(process.execPath, [TSC, "-p", tsconfig], {
    cwd: join(tsconfig, "../.."),
    encoding: "utf8",
  })
const dirs: string[] = []
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })))

const tempDir = () => {
  // Real, as git prints it: macOS's temp folder is behind a symlink.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "factory-cli-")))
  dirs.push(dir)
  return dir
}

/** An empty git repo. */
const repo = () => {
  const dir = tempDir()
  execFileSync("git", ["init", "--quiet", dir])
  return dir
}

/** A home directory whose `~/.config/factory/.env` holds a token. */
const homeWithToken = () => {
  const home = tempDir()
  mkdirSync(join(home, ".config/factory"), { recursive: true })
  writeFileSync(
    join(home, ".config/factory/.env"),
    "CLAUDE_CODE_OAUTH_TOKEN=fake-token\n"
  )
  return home
}

/** A git repo whose `.factory/factory.config.mts` is `config`. */
const project = (config: string) => {
  const dir = repo()
  mkdirSync(join(dir, ".factory"))
  writeFileSync(join(dir, ".factory/factory.config.mts"), config)
  return dir
}

/** Run the CLI in `cwd`, by default with a per-user token in a home of its
 *  own: never the developer's. */
const factory = (
  cwd: string,
  args: readonly string[],
  home = homeWithToken()
) =>
  spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, HOME: home },
  })

const configFor = (version: string) => `
import { defineFactory, type Check } from "factory"

const lint: Check = { name: "lint", command: "true" }

export default defineFactory({ version: ${JSON.stringify(version)}, checks: [lint] })
`

describe("the factory command", () => {
  it("loads a config that imports from factory, in a repo with no node_modules", () => {
    const dir = project(configFor(`^${factoryVersion()}`))
    // The options are checked once the config has loaded and resolved.
    const run = factory(dir, ["check", "--nope"])
    assert.equal(run.status, 1)
    assert.match(run.stderr, /factory check takes only --quick, got --nope\./)
  })

  it("stops when the CLI is outside the config's version range", () => {
    const dir = project(configFor("^99.0.0"))
    const run = factory(dir, ["check", "--quick"])
    assert.equal(run.status, 1)
    assert.match(run.stderr, /needs factory \^99\.0\.0, but .* is installed/)
    assert.match(run.stderr, /npm install -g "@tirso0882\/factory@\^99\.0\.0"/)
  })

  it("names the range when a config for a newer CLI won't even load", () => {
    const dir = project(`
import { defineFactory, fromTheFuture } from "factory"
export default defineFactory({ version: "^99.0.0", toolchains: [fromTheFuture()] })
`)
    const run = factory(dir, ["check"])
    assert.equal(run.status, 1)
    assert.match(run.stderr, /needs factory \^99\.0\.0, but .* is installed/)
  })

  it("names the missing config", () => {
    const run = factory(repo(), ["check"])
    assert.equal(run.status, 1)
    assert.match(run.stderr, /has no \.factory\/factory\.config\.mts/)
  })

  it("stops without either env file, naming both", () => {
    const dir = project(configFor(`^${factoryVersion()}`))
    const home = tempDir()
    const run = factory(dir, ["check", "--nope"], home)
    assert.equal(run.status, 1)
    assert.ok(run.stderr.includes(join(home, ".config/factory/.env")))
    assert.ok(run.stderr.includes(join(dir, ".factory/.env")))
  })

  it("prints its version anywhere", () => {
    const run = factory(tmpdir(), ["--version"])
    assert.equal(run.stdout.trim(), factoryVersion())
  })
})

describe("factory init", () => {
  it("scaffolds .factory/ and ignores what a run writes", () => {
    const dir = repo()
    const run = factory(dir, ["init"])
    assert.equal(run.status, 0, run.stderr)
    assert.deepEqual(readdirSync(join(dir, ".factory")).sort(), [
      "factory.config.mts",
      "node_modules",
      "standards.md",
      "tsconfig.json",
    ])
    const ignored = readFileSync(join(dir, ".gitignore"), "utf8").split("\n")
    for (const entry of [
      ".factory/logs/",
      ".factory/.env",
      ".sandcastle/",
      ".factory/node_modules/",
    ]) {
      assert.ok(ignored.includes(entry), `.gitignore lacks ${entry}`)
    }
  })

  it("writes a starter config that loads", () => {
    const dir = repo()
    factory(dir, ["init"])
    // The options are checked once the config has loaded and resolved.
    const run = factory(dir, ["check", "--nope"])
    assert.match(run.stderr, /factory check takes only --quick, got --nope\./)
  })

  /** The lines of the config init writes in a repo whose root holds
   *  `lockfiles`. */
  const initConfig = (...lockfiles: string[]) => {
    const dir = repo()
    for (const lockfile of lockfiles) writeFileSync(join(dir, lockfile), "")
    const run = factory(dir, ["init"])
    assert.equal(run.status, 0, run.stderr)
    return readFileSync(join(dir, ".factory/factory.config.mts"), "utf8").split("\n")
  }

  /** The commented checks block, from its `{ name, command }` lines. */
  const checksBlock = (...checks: string[]) =>
    [
      "  // checks: [",
      ...checks.map((check) => `  //   ${check}`),
      "  // ],",
    ].join("\n")

  const presets: [lockfile: string, preset: string, lint: string, test: string][] = [
    ["package-lock.json", "npm", "npm run lint", "npm test"],
    ["pnpm-lock.yaml", "pnpm", "pnpm lint", "pnpm test"],
    ["uv.lock", "uv", "uv run ruff check", "uv run pytest"],
  ]
  for (const [lockfile, preset, lint, test] of presets) {
    it(`turns on ${preset}() for a repo with ${lockfile}`, () => {
      const lines = initConfig(lockfile)
      assert.ok(lines.includes(`import { defineFactory, ${preset} } from "factory"`))
      assert.ok(lines.includes(`  toolchains: [${preset}()],`))
      assert.ok(!lines.some((line) => line.includes("// import")))
    })

    it(`suggests ${preset}'s checks for a repo with ${lockfile}`, () => {
      const config = initConfig(lockfile).join("\n")
      assert.ok(
        config.includes(
          checksBlock(
            `{ name: "lint", command: "${lint}" },`,
            `{ name: "tests", command: "${test}", slow: true },`
          )
        ),
        config
      )
    })
  }

  it("turns on a preset for each lockfile", () => {
    const lines = initConfig("uv.lock", "pnpm-lock.yaml")
    assert.ok(lines.includes('import { defineFactory, pnpm, uv } from "factory"'))
    assert.ok(lines.includes("  toolchains: [pnpm(), uv()],"))
  })

  it("suggests each preset's checks, named by preset, for each lockfile", () => {
    const config = initConfig("uv.lock", "pnpm-lock.yaml").join("\n")
    assert.ok(
      config.includes(
        checksBlock(
          '{ name: "pnpm lint", command: "pnpm lint" },',
          '{ name: "pnpm tests", command: "pnpm test", slow: true },',
          '{ name: "uv lint", command: "uv run ruff check" },',
          '{ name: "uv tests", command: "uv run pytest", slow: true },'
        )
      ),
      config
    )
  })

  it("leaves every toolchain commented out with no lockfile", () => {
    const config = initConfig().join("\n")
    assert.ok(
      config.includes(
        [
          'import { defineFactory } from "factory"',
          '// import { defineFactory, npm, pnpm, uv } from "factory"',
        ].join("\n")
      )
    )
    assert.ok(
      config.includes(
        [
          "  // Toolchain presets: cache mounts, a locked install and health probes.",
          "  // toolchains: [npm()],",
          "  // toolchains: [pnpm()],",
          "  // toolchains: [uv()],",
          "",
        ].join("\n")
      )
    )
    assert.ok(!config.includes("\n  toolchains:"))
    assert.ok(
      config.includes(
        checksBlock(
          '{ name: "lint", command: "pnpm lint" },',
          '{ name: "tests", command: "pnpm test", slow: true },'
        )
      ),
      config
    )
  })

  it("writes a starter config that type-checks with its presets", () => {
    const dir = repo()
    for (const lockfile of ["package-lock.json", "pnpm-lock.yaml", "uv.lock"]) {
      writeFileSync(join(dir, lockfile), "")
    }
    factory(dir, ["init"])
    const run = tsc(join(dir, ".factory/tsconfig.json"))
    assert.equal(run.status, 0, run.stdout)
  })

  it("keeps what .gitignore has and adds only what it lacks", () => {
    const dir = repo()
    writeFileSync(join(dir, ".gitignore"), "dist/\n.sandcastle/")
    factory(dir, ["init"])
    const lines = readFileSync(join(dir, ".gitignore"), "utf8").split("\n")
    assert.deepEqual(lines.slice(0, 2), ["dist/", ".sandcastle/"])
    assert.equal(lines.filter((line) => line === ".sandcastle/").length, 1)
    assert.ok(lines.includes(".factory/logs/"))
    assert.ok(lines.includes(".factory/.env"))
  })

  it("changes nothing in a repo that has .factory/", () => {
    const dir = repo()
    mkdirSync(join(dir, ".factory"))
    writeFileSync(join(dir, ".factory/factory.config.mts"), "mine\n")
    const run = factory(dir, ["init"])
    assert.equal(run.status, 1)
    assert.match(run.stderr, /\.factory already exists/)
    assert.deepEqual(readdirSync(join(dir, ".factory")), ["factory.config.mts"])
    assert.equal(readFileSync(join(dir, ".factory/factory.config.mts"), "utf8"), "mine\n")
    assert.equal(existsSync(join(dir, ".gitignore")), false)
  })

  it("gives an editor the config's types, with no package.json", () => {
    const dir = repo()
    factory(dir, ["init"])
    const tsconfig = join(dir, ".factory/tsconfig.json")
    const clean = tsc(tsconfig)
    assert.equal(clean.status, 0, clean.stdout)

    const config = join(dir, ".factory/factory.config.mts")
    writeFileSync(
      config,
      readFileSync(config, "utf8").replace('standards: "standards.md"', "standards: 42")
    )
    const broken = tsc(tsconfig)
    assert.equal(broken.status, 2)
    assert.match(
      broken.stdout,
      /^\.factory\/factory\.config\.mts\(\d+,\d+\): error TS2322: Type 'number' is not assignable to type 'string'\.$/mu
    )
  })

  it("commits no machine's paths, and any command relinks the types", () => {
    const dir = repo()
    factory(dir, ["init"])
    assert.ok(!readFileSync(join(dir, ".factory/tsconfig.json"), "utf8").includes("/"))
    // A fresh clone has the committed files but not the gitignored link.
    rmSync(join(dir, ".factory/node_modules"), { recursive: true })
    factory(dir, ["check", "--nope"])
    const run = tsc(join(dir, ".factory/tsconfig.json"))
    assert.equal(run.status, 0, run.stdout)
  })
})
