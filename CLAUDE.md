# Working in the factory

- Checks: the `checks` in `.factory/factory.config.mts`, the same gates as CI.
  Run one test file with `node --test <path>`; `npm test -- <path>` runs the
  whole suite as well.
- Tests for the CLI's root modules (`cli.mts`, `init.mts`) run the `factory`
  command, in `bin/factory.test.mts`.
- The reviewer holds each branch to `.factory/standards.md`.
