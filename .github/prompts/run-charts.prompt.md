---
agent: agent
description: Run Spotify chart collection and commit the intended chart-data changes to test_data.
---

Run `npm run charts` in this repository, then commit the intended chart-data changes to the `test_data` branch.

1. Check the current branch, Git status, and whether `test_data` is up to date with its remote before running the script. Do not overwrite or discard existing work.
2. Run `npm run charts`. If it fails because of an authentication issue, run `npm run auth`, complete any required authentication, and retry `npm run charts`. Confirm the charts command succeeds before proceeding.
3. Review the generated diff and stage only the intended chart-data changes. Preserve unrelated changes. In particular, inspect `charts/daily-song-charts.json` carefully because it may contain pre-existing uncommitted changes; do not include those unless they are confirmed to be from this run and intended.
4. Commit the intended chart-data changes on `test_data`. If working on another branch, integrate them into `test_data` safely without losing work.
5. Verify the resulting commit, branch, and Git status. Do not force-push. If authentication still fails, or there is a conflict, another failed command, unexpected changes, or any uncertainty about whether existing work should be included, stop and report the issue rather than guessing.
