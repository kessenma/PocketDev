# GitHub Token Setup for Coolify

The PocketDev web app queries the GitHub Releases API to list agent versions. Without a token, the unauthenticated rate limit is 60 requests/hour. Adding a fine-grained read-only token raises this to 5,000/hour.

## Step 1 — Create a Fine-Grained Personal Access Token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**
3. Fill in:
   - **Token name**: `pocketdev-coolify-read`
   - **Expiration**: 1 year (or "No expiration" if you prefer)
   - **Resource owner**: `kessenma`
   - **Repository access**: Only select repositories → choose `PocketDev`
4. Under **Permissions → Repository permissions**, set:
   - **Contents**: Read-only
   - Leave all other permissions as "No access"
5. Click **Generate token**
6. **Copy the token value** — it's only shown once

## Step 2 — Add the Token to Coolify

1. Open **Coolify** and navigate to your **web app service**
2. Go to **Configuration → Environment Variables**
3. Add a new variable:
   - **Key**: `GITHUB_TOKEN`
   - **Value**: paste the token you copied
   - **Scope**: Build + Runtime (it needs to be available at runtime for the version endpoint)
4. Click **Save**
5. Trigger a **redeploy** so the new env var takes effect

## Step 3 — Verify

After the deploy, check the version endpoint responds correctly:

```bash
curl https://pocketdev.run/agent/version
```

Expected response:
```json
{
  "version": "0.2.0",
  "versions": ["0.2.0"],
  "changelog_url": "https://pocketdev.run/changelog"
}
```

If you see a `503` response, GitHub may be unreachable or the token may be misconfigured. Check Coolify logs for `[agent-version]` error messages.

## Security Notes

- The token has **read-only access to repository Contents only** — it cannot push, create releases, or access any other resource
- If the token leaks, revoke it at GitHub Settings → Developer settings → Personal access tokens and generate a new one
- Without a token, the endpoint still works at 60 req/hr (unauthenticated); the token is optional but recommended for production
