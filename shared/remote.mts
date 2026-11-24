// The GitHub repo a project's git remote points at, so the factory works on
// whichever repo it runs in.

export type GitHubRepo = { owner: string; name: string; nameWithOwner: string }

// https://github.com/o/r(.git), ssh://git@github.com/o/r(.git), git@github.com:o/r(.git)
const GITHUB_REMOTE =
  /^(?:https:\/\/(?:[^@/]+@)?|ssh:\/\/git@|git@)github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/u

/** The GitHub repo of a remote's URL. */
export const githubRepo = (remoteUrl: string): GitHubRepo => {
  const match = GITHUB_REMOTE.exec(remoteUrl.trim())
  if (!match) {
    throw new Error(`The git remote ${remoteUrl} isn't a GitHub repo.`)
  }
  const [, owner = "", name = ""] = match
  return { owner, name, nameWithOwner: `${owner}/${name}` }
}
