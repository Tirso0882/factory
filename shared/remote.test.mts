import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { githubRepo } from "./remote.mts"

describe("githubRepo", () => {
  const expected = { owner: "Tirso0882", name: "goods", nameWithOwner: "Tirso0882/goods" }

  it("reads an HTTPS remote", () => {
    assert.deepEqual(githubRepo("https://github.com/Tirso0882/goods.git"), expected)
  })

  it("reads an HTTPS remote without .git or with a trailing slash", () => {
    assert.deepEqual(githubRepo("https://github.com/Tirso0882/goods"), expected)
    assert.deepEqual(githubRepo("https://github.com/Tirso0882/goods/"), expected)
  })

  it("reads an SSH remote, in scp form or as a URL", () => {
    assert.deepEqual(githubRepo("git@github.com:Tirso0882/goods.git"), expected)
    assert.deepEqual(githubRepo("ssh://git@github.com/Tirso0882/goods.git"), expected)
  })

  it("keeps dots in the repo's name", () => {
    assert.equal(
      githubRepo("https://github.com/Tirso0882/my.site.git").name,
      "my.site"
    )
  })

  it("refuses a remote that isn't on GitHub", () => {
    assert.throws(
      () => githubRepo("https://gitlab.com/Tirso0882/goods.git"),
      /isn't a GitHub repo/
    )
  })
})
