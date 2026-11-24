// The `factory` command (bin/factory.mjs loads it). It runs in the git repo
// it's started from, with that repo's `.factory/factory.config.mts`:
//
//   factory [--issue <n>]... [--parallel <n>]   build the backlog (main.mts)
//           [--update-pr <n> | --address-pr <n>]
//   factory check [--quick]   check the sandbox without an agent
//   factory preflight         one tiny agent call: does the token work?
//   factory --version

import { execFileSync } from "node:child_process"
import { factoryVersion, loadFactory } from "./shared/load-factory.mts"

const USAGE = `Usage, in a repo with .factory/factory.config.mts:
  factory [--issue <n>]... [--parallel <n>]   build the ready-for-agent backlog
  factory --update-pr <n>                     only merge the base branch into it
  factory --address-pr <n>                    only address your review of it
  factory check [--quick]                     check the sandbox, no tokens spent
  factory preflight                           check the Claude token
  factory --version`

/** The root of the git repo the command was started in. */
const repoRoot = () => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    throw new Error("Run factory inside a git repo.")
  }
}

/** An abort signal that Ctrl-C trips; a second Ctrl-C exits at once. */
const ctrlC = () => {
  const stop = new AbortController()
  process.on("SIGINT", () => {
    if (stop.signal.aborted) process.exit(130)
    console.warn("\nStopping. Ctrl-C again to quit.")
    stop.abort(new Error("Stopped by Ctrl-C."))
  })
  return stop.signal
}

const main = async (argv: readonly string[]) => {
  const [command, ...rest] = argv
  if (command === "--version" || command === "-v") {
    console.log(factoryVersion())
    return
  }
  if (command === "--help" || command === "-h" || command === "help") {
    console.log(USAGE)
    return
  }

  const root = repoRoot()
  // Sandcastle anchors worktrees and `.sandcastle/.env` to the working
  // directory, and the host's git and gh run in it (shared/host.mts).
  process.chdir(root)
  const factory = await loadFactory(root)

  // Each command's modules load only now: the host's look up the repo when
  // they load, which needs the working directory set.
  switch (command) {
    case "check": {
      const unknown = rest.filter((arg) => arg !== "--quick")
      if (unknown.length > 0) {
        throw new Error(`factory check takes only --quick, got ${unknown.join(" ")}.`)
      }
      const { checkEnvironment } = await import("./check-environment.mts")
      const failed = await checkEnvironment(factory, root, {
        quick: rest.includes("--quick"),
      })
      process.exitCode = failed === 0 ? 0 : 1
      return
    }
    case "preflight": {
      if (rest.length > 0) {
        throw new Error(`factory preflight takes no options, got ${rest.join(" ")}.`)
      }
      const { preflight } = await import("./workflows/preflight/preflight.mts")
      await preflight(factory, ctrlC())
      console.log("The agent logged in and answered.")
      return
    }
    default: {
      if (command !== undefined && !command.startsWith("-")) {
        throw new Error(`factory has no "${command}" command.\n\n${USAGE}`)
      }
      const { runFactory } = await import("./main.mts")
      await runFactory(factory, argv)
    }
  }
}

try {
  await main(process.argv.slice(2))
} catch (error) {
  // The message, and what caused it: a stack trace is noise for a config
  // mistake, and FACTORY_DEBUG=1 shows it.
  if (process.env["FACTORY_DEBUG"]) console.error(error)
  else {
    for (let e: unknown = error; e !== undefined; ) {
      const text = e instanceof Error ? e.message : String(e)
      console.error(e === error ? text : `  Caused by: ${text}`)
      e = e instanceof Error ? e.cause : undefined
    }
  }
  process.exitCode = 1
}
