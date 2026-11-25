// The variables every agent's sandbox gets on top of the project's: the
// Claude token and anything else a run needs that mustn't be committed. They
// live in two optional `.env` files, read in order:
//
//   ~/.config/factory/.env   once per user, for every project
//   <repo>/.factory/.env     this project's, over the user's
//
// A key with an empty value, in whichever file wins, takes the host's
// variable of that name. Only the keys these files declare reach the sandbox;
// the repo's own `.env` never does. Pure: the host is passed in (see
// factory.mts).

import { join } from "node:path"
import { parseEnvFile } from "./env-leaks.mts"
import type { Env, Host } from "./factory.mts"

export type AgentEnv = {
  /** Where the two files are, whether or not they exist. */
  files: { user: string; project: string }
  /** Every key the two files name, in the order they first appear. */
  declared: readonly string[]
  /** The values the sandbox gets: keys with no value anywhere are left out. */
  values: Env
}

/** The two files, the per-user one first. */
const agentEnvFiles = (host: Pick<Host, "home" | "repoRoot">) => ({
  user: join(host.home, ".config", "factory", ".env"),
  project: join(host.repoRoot, ".factory", ".env"),
})

/** The agent's variables for `host`. It throws, naming both files, if
 *  neither exists: without them no agent can log in. It throws too while the
 *  old `.sandcastle/.env` is left: Sandcastle reads it on its own and would
 *  pass its variables to every sandbox, declared here or not. */
export const resolveAgentEnv = (
  host: Pick<Host, "home" | "repoRoot" | "env" | "exists" | "read">
): AgentEnv => {
  const files = agentEnvFiles(host)
  const { user, project } = files
  const legacy = join(host.repoRoot, ".sandcastle", ".env")
  const present = [user, project].filter((path) => host.exists(path))
  const whereTokensGo = [
    `  ${user}   for every project`,
    `  ${project}   for this one`,
  ]
  if (host.exists(legacy)) {
    throw new Error(
      [
        `Move the tokens from ${legacy} to either file, then delete it: Sandcastle passes it to every sandbox.`,
        ...whereTokensGo,
      ].join("\n")
    )
  }
  if (present.length === 0) {
    throw new Error(
      [
        "The agent has no token. Put CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`) in either:",
        ...whereTokensGo,
      ].join("\n")
    )
  }
  // The project's file is read last, so it wins.
  const fromFiles = new Map<string, string>()
  for (const path of present) {
    for (const [key, value] of parseEnvFile(host.read(path))) {
      fromFiles.set(key, value)
    }
  }
  const values: Env = {}
  for (const [key, value] of fromFiles) {
    const resolved = value || host.env[key] || ""
    if (resolved) values[key] = resolved
  }
  return { files, declared: [...fromFiles.keys()], values }
}
