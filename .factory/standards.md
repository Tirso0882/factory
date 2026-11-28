# Coding standards

The reviewer holds every branch to this file, on top of the conventions of
the code around the change.

## Code

- Checks cover the mechanical rules: `tsc` holds the code to erasable syntax
  and imports with their extension, Prettier formats it (`npm run format`),
  and ESLint wants a header comment in every source file.
- Keep decisions pure. `resolveFactory` and the modules like it take the
  host's facts as data (`Host`) and do no I/O; files, commands and the
  environment stay at the edges (`shared/host.mts`, `cli.mts`).
- The factory's security guarantees aren't config: a change can't let a
  project drop a security step, mount the real home or a credential, or let
  `env` repoint a variable a toolchain or the factory owns.
- Errors a user sees say what's wrong and what to do, in one or two plain
  sentences, naming the config field (`skills: the pr skill is missing: ...`).
- A fact the code already names, such as a path, a list or a constant, has
  one owner: import it from there rather than writing it again.
- A change that makes nearby text wrong (a comment, an example, the starter
  config `factory init` writes, the README) fixes that text in the same
  branch.

## Comments

- A source file's header comment says what the file is for. Test files may
  start with their imports instead.
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

- Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`,
  `ci:`, `build:`, `chore:`): release-please builds the changelog and the
  version from them. A breaking change
  to the config bumps the minor version before 1.0.
- Never commit `.env` files, tokens, `.factory/logs/` or `.sandcastle/`.
- Don't edit `CHANGELOG.md` or `.release-please-manifest.json` by hand.
