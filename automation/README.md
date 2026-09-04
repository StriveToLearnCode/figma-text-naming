# AI Platform test release

Run from this repository when a feature branch is ready:

```bash
./automation/release-ai-platform-test.sh /path/to/ai-platform
```

The script performs the following guarded workflow:

1. Requires clean worktrees in both repositories.
2. Fast-forwards the current source branch into this repository's `main` and pushes it.
3. Copies the Skill into `skills/activity/frontend/figma-text-naming` on a temporary AI Platform sync branch.
4. Pushes the sync branch, creates a merge commit on top of the latest `origin/dev`, and pushes `dev` for test deployment.

It never updates AI Platform `main`. A non-fast-forward update or concurrent `dev` change causes the release to stop instead of overwriting remote history.

The default AI Platform path matches the local workspace layout. Override settings when needed:

```bash
AI_PLATFORM_REPO=/path/to/ai-platform \
SOURCE_REF=feat/example \
SOURCE_MAIN_BRANCH=main \
TARGET_BRANCH=dev \
SYNC_BRANCH=sync/figma-text-naming-example \
./automation/release-ai-platform-test.sh
```
