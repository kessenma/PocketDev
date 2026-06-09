import * as Keychain from 'react-native-keychain'

const PAT_SERVICE = 'pocketdev-github-pat'

export async function saveGitHubPAT(token: string): Promise<void> {
  await Keychain.setGenericPassword('github-pat', token, {
    service: PAT_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  })
}

export async function getGitHubPAT(): Promise<string | null> {
  const creds = await Keychain.getGenericPassword({ service: PAT_SERVICE })
  return creds ? creds.password : null
}

export async function clearGitHubPAT(): Promise<void> {
  await Keychain.resetGenericPassword({ service: PAT_SERVICE })
}

/** Verify a token is valid by calling the GitHub /user endpoint. Returns the GitHub username on success. */
export async function validateGitHubPAT(token: string): Promise<string> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!response.ok) throw new Error('Invalid GitHub token — check it has the correct permissions.')
  const data = await response.json() as { login?: string }
  return data.login ?? 'unknown'
}

/** Create a GitHub issue directly using a PAT (fallback path when server gh cli is unavailable). */
export async function createGitHubIssueDirect(opts: {
  token: string
  title: string
  body: string
}): Promise<{ url: string }> {
  const response = await fetch('https://api.github.com/repos/kessenma/PocketDev/issues', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: opts.title,
      body: opts.body,
      labels: ['bug'],
    }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => response.status.toString())
    throw new Error(`GitHub API error: ${text}`)
  }
  const data = await response.json() as { html_url?: string }
  return { url: data.html_url ?? '' }
}
