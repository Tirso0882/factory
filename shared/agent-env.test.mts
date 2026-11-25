import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolveFactory } from "./factory.mts"
import { fakeHost } from "./fake-host.mts"

const USER_FILE = "/home/dev/.config/factory/.env"
const PROJECT_FILE = "/repo/.factory/.env"

describe("the agent's env files", () => {
  it("gives every project the per-user token", () => {
    const host = fakeHost({
      userEnv: "CLAUDE_CODE_OAUTH_TOKEN=user-token\n",
    })
    const { declared, values } = resolveFactory({}, host).agentEnv
    assert.deepEqual(declared, ["CLAUDE_CODE_OAUTH_TOKEN"])
    assert.deepEqual(values, { CLAUDE_CODE_OAUTH_TOKEN: "user-token" })
  })

  it("lets the project's file override the per-user one", () => {
    const host = fakeHost({
      userEnv: "CLAUDE_CODE_OAUTH_TOKEN=user-token\nGH_TOKEN=user-gh\n",
      contents: {
        [PROJECT_FILE]: "CLAUDE_CODE_OAUTH_TOKEN='project-token'\n",
      },
    })
    assert.deepEqual(resolveFactory({}, host).agentEnv.values, {
      CLAUDE_CODE_OAUTH_TOKEN: "project-token",
      GH_TOKEN: "user-gh",
    })
  })

  it("works with the project's file alone", () => {
    const host = fakeHost({
      userEnv: null,
      contents: { [PROJECT_FILE]: "ANTHROPIC_API_KEY=project-key\n" },
    })
    const { declared, values } = resolveFactory({}, host).agentEnv
    assert.deepEqual(declared, ["ANTHROPIC_API_KEY"])
    assert.deepEqual(values, { ANTHROPIC_API_KEY: "project-key" })
  })

  it("takes an empty value from the host, even over the per-user one", () => {
    const host = fakeHost({
      userEnv: "CLAUDE_CODE_OAUTH_TOKEN=user-token\nGH_TOKEN=\n",
      contents: { [PROJECT_FILE]: "CLAUDE_CODE_OAUTH_TOKEN=\n" },
      env: { GH_TOKEN: "host-gh", CLAUDE_CODE_OAUTH_TOKEN: "host-token" },
    })
    assert.deepEqual(resolveFactory({}, host).agentEnv.values, {
      CLAUDE_CODE_OAUTH_TOKEN: "host-token",
      GH_TOKEN: "host-gh",
    })
  })

  it("declares a key it has no value for, and passes none", () => {
    const host = fakeHost({ userEnv: "GH_TOKEN=\n" })
    const { declared, values } = resolveFactory({}, host).agentEnv
    assert.deepEqual(declared, ["GH_TOKEN"])
    assert.deepEqual(values, {})
  })

  it("says where both files are, for the CLI's messages", () => {
    assert.deepEqual(resolveFactory({}, fakeHost()).agentEnv.files, {
      user: USER_FILE,
      project: PROJECT_FILE,
    })
  })

  it("stops without either file, naming both", () => {
    assert.throws(
      () => resolveFactory({}, fakeHost({ userEnv: null })),
      (error: Error) =>
        error.message.includes(USER_FILE) &&
        error.message.includes(PROJECT_FILE)
    )
  })

  it("stops while a .sandcastle/.env is left, which Sandcastle still passes on", () => {
    const host = fakeHost({
      contents: { "/repo/.sandcastle/.env": "STRIPE_API_KEY=old\n" },
    })
    assert.throws(
      () => resolveFactory({}, host),
      /Move the tokens from \/repo\/\.sandcastle\/\.env/
    )
  })
})
