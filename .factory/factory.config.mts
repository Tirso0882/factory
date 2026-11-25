// The factory's settings for its own repo: the factory builds the factory's
// ready-for-agent issues into pull requests.
//
//   factory check --quick   check the sandbox after changing this file

import { defineFactory, npm } from "factory"

export default defineFactory({
  // The factory CLI versions this config works with. A CLI outside the range
  // stops and names the version to install. 0.1.2 is the first with npm().
  version: "^0.1.2",

  // npm, because the release publishes with npm's trusted publishing.
  toolchains: [npm()],

  // The same gates as CI (.github/workflows/ci.yml).
  checks: [
    { name: "typecheck", command: "npm run typecheck" },
    { name: "test", command: "npm test" },
    { name: "lint", command: "npm run lint" },
  ],

  // npm() skips install scripts. esbuild has one, but tsx runs without it
  // because esbuild's binary comes as an optional dependency: the CLI
  // starting proves it.
  probes: [
    {
      name: "the CLI runs without esbuild's install script",
      command: "node bin/factory.mjs --version",
    },
  ],

  // The coding standards the reviewer holds each branch to, in .factory/.
  standards: "standards.md",

  // Skills from ~/.claude/skills the agents may use.
  skills: ["pr"],
})
