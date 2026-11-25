// A host faked as plain data, for the tests: the files that exist, the
// symlinks, the files' text, what commands print and the environment. No real file, command
// or OS.

import type { Host } from "./factory.mts"

type FakeHost = {
  repoRoot?: string
  /** The installed CLI's version. */
  factoryVersion?: string
  files?: readonly string[]
  outputs?: Readonly<Record<string, string>>
  env?: Readonly<Record<string, string>>
  /** Symlinks: a path and where it really is. */
  links?: Readonly<Record<string, string>>
  /** Files to read, by path, and what they hold. They exist too. */
  contents?: Readonly<Record<string, string>>
  /** The per-user `~/.config/factory/.env`, or `null` for none. By default
   *  it holds a fake token, so the factory resolves. */
  userEnv?: string | null
}

const USER_ENV_FILE = "/home/dev/.config/factory/.env"

export const fakeHost = ({
  repoRoot = "/repo",
  factoryVersion = "0.1.0",
  files = [],
  outputs = {},
  env = {},
  links = {},
  contents: callerContents = {},
  userEnv = "CLAUDE_CODE_OAUTH_TOKEN=fake-token\n",
}: FakeHost = {}): Host => {
  const contents: Readonly<Record<string, string>> =
    userEnv === null
      ? callerContents
      : { [USER_ENV_FILE]: userEnv, ...callerContents }
  return {
    repoRoot,
    factoryVersion,
    home: "/home/dev",
    env,
    exists: (path) => files.includes(path) || path in contents,
    read: (path) => {
      const text = contents[path]
      if (text === undefined) throw new Error(`The fake host has no ${path}.`)
      return text
    },
    realPath: (path) => links[path] ?? path,
    output: (command) => {
      const out = outputs[command.join(" ")]
      if (out === undefined) {
        throw new Error(`The fake host can't run: ${command.join(" ")}`)
      }
      return out
    },
  }
}
