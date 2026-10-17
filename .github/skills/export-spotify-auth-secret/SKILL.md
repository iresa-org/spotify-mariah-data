---
name: export-spotify-auth-secret
description: 'Export Spotify Charts authentication and update the repository GitHub Actions secret. Use when refreshing SPOTIFY_CHARTS_STORAGE_STATE or publishing exported Spotify auth to this repository.'
user-invocable: true
disable-model-invocation: true
---

# Export Spotify Auth to a GitHub Secret

Run this workflow only when the user explicitly invokes the skill. The exported storage state contains authentication cookies and is sensitive.

1. Confirm the working directory is this repository and run `gh auth status`. Stop if GitHub CLI is not authenticated or cannot access `iresa-org/spotify-mariah-data`.
2. Check whether npm dependencies are installed with `npm ls --depth=0`. If the check reports missing or invalid dependencies, run `npm install` and confirm it completes successfully before continuing.
3. Run `npm run auth:export` in PowerShell, redirecting standard output to `$null` so the exported credential is not printed:

   ```powershell
   npm run auth:export > $null
   if ($LASTEXITCODE -ne 0) { throw 'Spotify auth export failed.' }
   ```

   This command may open a browser for Spotify login. Wait for it to finish. If it fails, stop and report the error without retrying blindly.
4. Confirm `auth\spotify-charts-auth.txt` exists and is non-empty without displaying or reading its contents. The `auth\` directory is gitignored; do not stage or commit the export.
5. Send the file contents directly to GitHub CLI over stdin to set the repository Actions secret. Use `cmd.exe` file redirection from PowerShell to preserve the file bytes. Do not put the secret in a command argument, environment variable, chat message, or terminal output:

   ```powershell
   cmd.exe /d /c "gh secret set SPOTIFY_CHARTS_STORAGE_STATE --repo iresa-org/spotify-mariah-data < auth\spotify-charts-auth.txt"
   if ($LASTEXITCODE -ne 0) { throw 'Setting the GitHub secret failed.' }
   ```

   This updates/replaces the repository secret used by `.github/workflows/charts.yml`.
6. Verify the secret name is listed, without exposing its value:

   ```powershell
   gh secret list --repo iresa-org/spotify-mariah-data
   ```

Report whether export and secret update succeeded. Never print the exported storage state or include it in the response. If any step fails, stop without claiming success.
