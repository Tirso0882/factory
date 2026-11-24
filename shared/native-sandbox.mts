// Which native sandbox the host runs agents in. The factory picks it on every
// run, so one committed config works on every machine: the config has no OS
// setting.

/** What the choice reads from the host: `process.platform` and
 *  `os.release()` (the kernel's version: Darwin's, on macOS). */
export type Host = { platform: NodeJS.Platform; release: string }

export type NativeSandbox = "bwrap" | "seatbelt"

/** Darwin 23 is macOS 14, the first macOS seatbelt supports. */
const FIRST_SEATBELT_DARWIN = 23

/** From Darwin 20 (macOS 11) on, the macOS major is Darwin's less 9. */
const FIRST_NUMBERED_DARWIN = 20
const DARWIN_TO_MACOS = 9

/** The native sandbox for `host`: bwrap on Linux (WSL2 reports itself as
 *  Linux), seatbelt on macOS 14 and later. Anywhere else it throws: the
 *  factory never runs an agent unsandboxed. */
export const chooseNativeSandbox = (host: Host): NativeSandbox => {
  if (host.platform === "linux") return "bwrap"
  if (host.platform === "darwin") {
    const darwin = Number.parseInt(host.release, 10)
    if (darwin >= FIRST_SEATBELT_DARWIN) return "seatbelt"
    throw unsupported(macOSName(darwin))
  }
  throw unsupported(host.platform === "win32" ? "native Windows" : host.platform)
}

const macOSName = (darwin: number) => {
  if (Number.isNaN(darwin)) return "a macOS whose version can't be read"
  return darwin >= FIRST_NUMBERED_DARWIN
    ? `macOS ${darwin - DARWIN_TO_MACOS}`
    : "a macOS older than 11"
}

const unsupported = (hostName: string) =>
  new Error(
    `This host is ${hostName}, which has no sandbox the factory supports. ` +
      "Use Linux, WSL2 on Windows, or macOS 14 or later."
  )
