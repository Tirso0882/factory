import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { chooseNativeSandbox } from "./native-sandbox.mts"

describe("chooseNativeSandbox", () => {
  it("picks bwrap on Linux", () => {
    assert.equal(
      chooseNativeSandbox({ platform: "linux", release: "6.8.0-45-generic" }),
      "bwrap"
    )
  })

  it("picks bwrap on WSL2, which reports itself as Linux", () => {
    assert.equal(
      chooseNativeSandbox({
        platform: "linux",
        release: "5.15.153.1-microsoft-standard-WSL2",
      }),
      "bwrap"
    )
  })

  it("picks seatbelt on macOS 14 (Darwin 23)", () => {
    assert.equal(
      chooseNativeSandbox({ platform: "darwin", release: "23.0.0" }),
      "seatbelt"
    )
  })

  it("picks seatbelt on a later macOS", () => {
    assert.equal(
      chooseNativeSandbox({ platform: "darwin", release: "25.1.0" }),
      "seatbelt"
    )
  })

  it("refuses native Windows, pointing at WSL2", () => {
    assert.throws(
      () => chooseNativeSandbox({ platform: "win32", release: "10.0.22631" }),
      (error: Error) =>
        /Windows/.test(error.message) &&
        /WSL2/.test(error.message) &&
        /macOS 14/.test(error.message)
    )
  })

  it("refuses macOS 13 (Darwin 22), naming the macOS it needs", () => {
    assert.throws(
      () => chooseNativeSandbox({ platform: "darwin", release: "22.6.0" }),
      (error: Error) =>
        /macOS 13/.test(error.message) &&
        /macOS 14 or later/.test(error.message) &&
        /WSL2/.test(error.message)
    )
  })

  it("refuses a macOS whose version it can't read, without guessing one", () => {
    assert.throws(
      () => chooseNativeSandbox({ platform: "darwin", release: "" }),
      (error: Error) =>
        /can't be read/.test(error.message) && !/older than/.test(error.message)
    )
  })

  it("refuses a host with no native sandbox, never running unsandboxed", () => {
    assert.throws(
      () => chooseNativeSandbox({ platform: "freebsd", release: "14.1-RELEASE" }),
      (error: Error) =>
        /freebsd/.test(error.message) &&
        /Linux, WSL2 on Windows, or macOS 14 or later/.test(error.message)
    )
  })
})
