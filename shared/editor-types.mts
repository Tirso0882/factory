// Gives an editor the types of a project's `.factory/factory.config.mts`, in
// a repo with no Node tooling. The committed `.factory/tsconfig.json` holds
// no machine's paths: the config's `factory` import resolves through
// `.factory/node_modules/factory`, a gitignored link to the CLI that's
// installed here. Every `factory` command remakes the link, so a fresh clone
// or another Node version gets it on the first run.

import {
  existsSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from "node:fs"
import { dirname, join } from "node:path"

/** The installed CLI, whose index.mts the config imports. */
const PACKAGE_ROOT = join(import.meta.dirname, "..")

/** The link the config's `factory` import resolves through. */
export const EDITOR_LINK = ".factory/node_modules/"

/** The tsconfig an editor reads for the config. Its options match the
 *  factory's own tsconfig.json, which its sources need. */
export const STARTER_TSCONFIG = `${JSON.stringify(
  {
    compilerOptions: {
      target: "ES2023",
      lib: ["ES2023"],
      module: "NodeNext",
      moduleResolution: "NodeNext",
      // The factory's index.mts brings the Node types it needs.
      types: [],
      strict: true,
      noUncheckedIndexedAccess: true,
      noEmit: true,
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      erasableSyntaxOnly: true,
      skipLibCheck: true,
    },
    include: ["factory.config.mts"],
  },
  null,
  2
)}\n`

/** Points `.factory/node_modules/factory` at this CLI, in a repo that has
 *  `.factory/`. */
export const linkEditorTypes = (repoRoot: string) => {
  if (!existsSync(join(repoRoot, ".factory"))) return
  const link = join(repoRoot, EDITOR_LINK, "factory")
  let current: string | undefined
  try {
    current = readlinkSync(link)
  } catch {
    current = undefined
  }
  if (current === PACKAGE_ROOT) return
  rmSync(link, { recursive: true, force: true })
  mkdirSync(dirname(link), { recursive: true })
  symlinkSync(PACKAGE_ROOT, link, "dir")
}
