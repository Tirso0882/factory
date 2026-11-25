// `factory init`: sets up a repo for the factory. It writes `.factory/` with a
// commented starter config (which turns on the toolchain presets whose
// lockfiles are in the repo's root, and suggests their checks), a coding
// standards file and the tsconfig that gives an editor the config's types
// (shared/editor-types.mts), and it gitignores what a run writes. It never touches an existing `.factory/`.

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import {
  EDITOR_LINK,
  STARTER_TSCONFIG,
  linkEditorTypes,
} from "./shared/editor-types.mts"
import {
  NPM_LOCKFILE,
  PNPM_LOCKFILE,
  UV_LOCKFILE,
} from "./shared/factory.mts"
import { CONFIG_PATH } from "./shared/load-factory.mts"

/** What a run writes and git must never see. */
const IGNORED = [".factory/logs/", ".factory/.env", ".sandcastle/", EDITOR_LINK]

/** A toolchain preset: the lockfile that calls for it, and the lint and test
 *  commands the starter suggests as checks with it. */
interface Preset {
  lockfile: string
  preset: string
  lint: string
  test: string
}

/** The toolchain presets, each by the lockfile that calls for it. */
const PRESETS: readonly Preset[] = [
  {
    lockfile: NPM_LOCKFILE.path,
    preset: "npm",
    lint: "npm run lint",
    test: "npm test",
  },
  {
    lockfile: PNPM_LOCKFILE.path,
    preset: "pnpm",
    lint: "pnpm lint",
    test: "pnpm test",
  },
  {
    lockfile: UV_LOCKFILE.path,
    preset: "uv",
    lint: "uv run ruff check",
    test: "uv run pytest",
  },
]

/** The example checks with no preset on, as the starter has always had. */
const DEFAULT_CHECKS = PRESETS.filter(({ preset }) => preset === "pnpm")

/** The presets whose lockfiles are in the repo's root. */
const presetsIn = (repoRoot: string) =>
  PRESETS.filter(({ lockfile }) => existsSync(join(repoRoot, lockfile)))

/** The config's import line and toolchains, for the presets `on`: with
 *  none, every preset is there, commented out. */
const toolchainLines = (on: readonly Preset[]) =>
  on.length === 0
    ? {
        imports: `import { defineFactory } from "factory"
// import { defineFactory, ${PRESETS.map(({ preset }) => preset).join(", ")} } from "factory"`,
        toolchains: PRESETS.map(
          ({ preset }) => `  // toolchains: [${preset}()],`
        ).join("\n"),
      }
    : {
        imports: `import { defineFactory, ${on.map(({ preset }) => preset).join(", ")} } from "factory"`,
        toolchains: `  toolchains: [${on.map(({ preset }) => `${preset}()`).join(", ")}],`,
      }

/** The commented example checks, with the commands of the presets `on`:
 *  with more than one, each check's name says whose it is. */
const checkLines = (on: readonly Preset[]) => {
  const presets = on.length === 0 ? DEFAULT_CHECKS : on
  const named = (preset: string, name: string) =>
    presets.length > 1 ? `${preset} ${name}` : name
  return presets
    .flatMap(({ preset, lint, test }) => [
      `  //   { name: "${named(preset, "lint")}", command: "${lint}" },`,
      `  //   { name: "${named(preset, "tests")}", command: "${test}", slow: true },`,
    ])
    .join("\n")
}

/** The config `factory init` writes, for the CLI at `version`, with the
 *  presets `on` turned on. */
const starterConfig = (version: string, on: readonly Preset[]) => {
  const { imports, toolchains } = toolchainLines(on)
  return `// The factory's settings for this repo. \`factory\` builds the repo's
// ready-for-agent issues into pull requests; this file says what differs from
// the defaults. Every field is optional, and your editor shows the rest.
//
//   factory check --quick   check the sandbox after changing this file

${imports}

export default defineFactory({
  // The factory CLI versions this config works with. A CLI outside the range
  // stops and names the version to install.
  version: "^${version}",

  // Toolchain presets: cache mounts, a locked install and health probes.
${toolchains}

  // Quality gates. The agents run them before they commit, and so does
  // \`factory check\`; \`slow\` ones are skipped by \`factory check --quick\`.
  // checks: [
${checkLines(on)}
  // ],

  // Environment health that only \`factory check\` runs.
  // probes: [{ name: "the database answers", command: "pg_isready" }],

  // The coding standards the reviewer holds each branch to, in .factory/.
  standards: "standards.md",

  // Skills from ~/.claude/skills the agents may use.
  // skills: ["pr"],

  // Guidance appended to a workflow's prompt.
  // instructions: { implement: "Run the migrations before the tests." },

  // Names, models, limits and timeouts all have defaults.
  // names: { baseBranch: "main" },
  // limits: { parallel: 2 },
})
`
}

/** A standards file to fill in. */
const STANDARDS = `# Coding standards

The reviewer holds every branch to this file. Write down the rules a newcomer
to this repo would get wrong: naming, error handling, what a test checks,
what never goes in a commit.

- Match the conventions of the code around the change.
`

/** Adds the entries `.gitignore` lacks, and says which. */
const ignoreRunFiles = (repoRoot: string) => {
  const path = join(repoRoot, ".gitignore")
  const text = existsSync(path) ? readFileSync(path, "utf8") : ""
  const lines = new Set(text.split(/\r?\n/u).map((line) => line.trim()))
  const missing = IGNORED.filter((entry) => !lines.has(entry))
  if (missing.length === 0) return missing
  const gap = text === "" ? "" : text.endsWith("\n") ? "\n" : "\n\n"
  appendFileSync(path, `${gap}# factory\n${missing.join("\n")}\n`)
  return missing
}

/** Scaffolds `.factory/` in the repo at `repoRoot`, or throws when it's
 *  there already. Returns what it did, for the user. */
export const init = (repoRoot: string, factoryVersion: string): string[] => {
  const dir = join(repoRoot, ".factory")
  if (existsSync(dir)) {
    throw new Error(`${dir} already exists, so factory init changed nothing.`)
  }
  mkdirSync(dir)
  writeFileSync(
    join(repoRoot, CONFIG_PATH),
    starterConfig(factoryVersion, presetsIn(repoRoot))
  )
  writeFileSync(join(dir, "standards.md"), STANDARDS)
  writeFileSync(join(dir, "tsconfig.json"), STARTER_TSCONFIG)
  linkEditorTypes(repoRoot)
  const ignored = ignoreRunFiles(repoRoot)
  return [
    "Wrote .factory/factory.config.mts, .factory/standards.md and .factory/tsconfig.json.",
    ignored.length > 0
      ? `Added ${ignored.join(", ")} to .gitignore.`
      : ".gitignore already ignores what a run writes.",
    "Next: fill in the config, then run factory check --quick.",
  ]
}
