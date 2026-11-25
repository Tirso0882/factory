# Coding standards

The reviewer holds every branch to this file, on top of the conventions of
the code around the change.

## Code

- TypeScript in `.mts` files, with erasable syntax only: Node runs the tests
  by stripping the types, so no enums, namespaces or parameter properties.
- Imports carry their extension (`./factory.mts`).
- No semicolons, double quotes, trailing commas where the formatter puts
  them: match the file.
- Keep decisions pure. `resolveFactory` and the modules like it take the
  host's facts as data (`Host`) and do no I/O; files, commands and the
  environment stay at the edges (`shared/host.mts`, `cli.mts`).
- The factory's security guarantees aren't config: a change can't let a
  project drop a security step, mount the real home or a credential, or let
  `env` repoint a variable a toolchain or the factory owns.
- Errors a user sees say what's wrong and what to do, in one or two plain
  sentences, naming the config field (`skills: the pr skill is missing: ...`).

## Comments

- A file starts with a comment that says what it is for.
- Comments say why, in plain words. They don't narrate the code.

## Tests

- Tests sit beside the code as `*.test.mts`, on `node:test` and
  `node:assert/strict`.
- Test through the public function, with the host faked as data
  (`shared/fake-host.mts`). Don't mock a module's internals.
- Expected values are literals, not recomputed the way the code computes
  them.
- A test's name says the behavior, in the domain's words.

## Commits and pull requests

- Conventional Commits (`feat:`, `fix:`, `ci:`, `chore:`, `docs:`): release
  please builds the changelog and the version from them. A breaking change
  to the config bumps the minor version before 1.0.
- Never commit `.env` files, tokens, `.factory/logs/` or `.sandcastle/`.
- Don't edit `CHANGELOG.md` or `.release-please-manifest.json` by hand.
