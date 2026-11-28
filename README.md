<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Tirso0882/factory/main/.github/assets/readme-factory-ondark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Tirso0882/factory/main/.github/assets/readme-factory-onlight.svg">
    <img alt="factory" src="https://raw.githubusercontent.com/Tirso0882/factory/main/.github/assets/readme-factory-onlight.svg" height="240" style="margin-bottom: 20px;">
  </picture>
</div>

## What is factory?

A CLI that builds your GitHub issues into pull requests while you're away:

1. You write an issue and label it `ready-for-agent`.
2. You run `factory` in the repo. Each ticket gets its own sandbox and branch, where an agent builds it and a second agent reviews it against your coding standards.
3. You get a pull request with green CI. You review it, and the factory addresses your comments when you hand it back.

Nothing merges by itself. A ticket the factory can't finish goes to `ready-for-human` with a comment saying why.

It's installed once per machine and works in any repo, Node or not. Each project keeps only a small `.factory/` folder. Agents run in your OS's own sandbox (bwrap on Linux and WSL2, seatbelt on macOS 14+), built on [Sandcastle](https://github.com/mattpocock/sandcastle).

## Getting started

You need Node 24+, [`gh`](https://cli.github.com) signed in, a Claude subscription or API key, and Linux, WSL2 or macOS 14+. On Linux, install `bubblewrap`.

```bash
npm install -g @tirso0882/factory
```

Save your Claude token once per machine in `~/.config/factory/.env`:

```bash
claude setup-token   # prints a token
```

```dotenv
CLAUDE_CODE_OAUTH_TOKEN=...
```

Then, in each project:

```bash
factory init              # scaffold .factory/
factory check --quick     # check the sandbox, no tokens spent
factory preflight         # one tiny agent call: does the token work?
factory                   # build the ready-for-agent backlog
```

`factory init` picks the toolchain from the repo's lockfile and writes a commented config, a coding standards file and editor types. Edit the config, commit `.factory/`, and you're ready.

## Commands

| Command                    | What it does                                                     |
| -------------------------- | ---------------------------------------------------------------- |
| `factory`                  | Works through the backlog in waves: update, address, plan, build |
| `factory --issue <n>`      | Builds only these issues (repeatable)                            |
| `factory --parallel <n>`   | Caps the agents running at once (default 3)                      |
| `factory --address-pr <n>` | Only addresses your review of one pull request                   |
| `factory --update-pr <n>`  | Only merges the base branch into one pull request                |
| `factory init`             | Scaffolds `.factory/`                                            |
| `factory check [--quick]`  | Checks the sandbox without an agent; `--quick` skips slow checks |
| `factory preflight`        | Checks the Claude token                                          |

Set `FACTORY_DEBUG=1` for full stack traces.

## How a run works

Each wave does four things:

- **Update:** merges the base branch into every factory pull request that conflicts with it, with an agent resolving the conflicts.
- **Address:** takes each factory pull request you labelled `ready-for-agent` back to an agent with your unresolved review comments.
- **Plan:** lists the open `ready-for-agent` issues you wrote, drops the blocked ones, and picks which can be built side by side.
- **Build:** for each ticket, an implementer builds it on `factory/issue-<n>`, a reviewer checks it, a writer drafts the pull request, and the factory waits for CI, handing failures back to the implementer.

Only issues and reviews from the repo's owner are acted on.

## Configuration

`.factory/factory.config.mts` declares what's specific to the project. Everything else has a default.

```ts
import { defineFactory, pnpm } from "factory";

export default defineFactory({
  version: "^0.1.3", // the CLI versions this config works with
  toolchains: [pnpm()], // or npm(), uv(): caches, locked installs, health checks
  checks: [
    { name: "lint", command: "pnpm lint" },
    { name: "test", command: "pnpm test", slow: true },
  ],
  standards: "standards.md", // what the reviewer holds each branch to
  skills: ["pr"], // from ~/.claude/skills
});
```

| Setting                                            | For                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `checks`                                           | Quality gates the agents run before committing, and `factory check` runs too |
| `probes`                                           | Environment health, such as dependencies installed or the database answering |
| `toolchains`, `mounts`, `setup`                    | What the sandbox needs                                                       |
| `services`, `env`, `maxSlots`                      | A compose file of test services, and variables per parallel slot             |
| `standards`, `skills`, `instructions`              | Guidance for the agents                                                      |
| `names`, `models`, `limits`, `timeouts`, `retries` | Labels, branch names, models and limits, to override defaults                |

Project knowledge, such as where tests live and the commit scopes, belongs in the project's `AGENTS.md` or `CLAUDE.md`, which every agent reads. The factory's own [config](./.factory/factory.config.mts) is a working example.

A project's `.factory/.env` overrides `~/.config/factory/.env`.

## Development

```bash
npm install
npm run typecheck   # Type-check
npm test            # Run tests with node --test
npm run lint        # Lint with ESLint
```

The factory builds its own tickets: file an issue here, label it `ready-for-agent`, and run `factory`. Releases are cut by release-please and published to npm by CI.
