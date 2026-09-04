#!/usr/bin/env bash

set -euo pipefail

SOURCE_REPO="$(git -C "$(dirname "${BASH_SOURCE[0]}")/.." rev-parse --show-toplevel)"
DEFAULT_AI_PLATFORM_REPO="$(dirname "${SOURCE_REPO}")/wepie/frontend-code/ai-platform"
AI_PLATFORM_REPO="${1:-${AI_PLATFORM_REPO:-${DEFAULT_AI_PLATFORM_REPO}}}"
SOURCE_REF="${SOURCE_REF:-$(git -C "${SOURCE_REPO}" branch --show-current)}"
SOURCE_MAIN_BRANCH="${SOURCE_MAIN_BRANCH:-main}"
TARGET_BRANCH="${TARGET_BRANCH:-dev}"
SYNC_BRANCH="${SYNC_BRANCH:-sync/figma-text-naming-$(date '+%Y%m%d-%H%M%S')}"
SKILL_DEST_REL="skills/activity/frontend/figma-text-naming"

require_clean_worktree() {
  local repo="$1"

  if [[ -n "$(git -C "${repo}" status --porcelain)" ]]; then
    echo "Refusing to release: dirty worktree at ${repo}" >&2
    exit 1
  fi
}

for command_name in git rsync mktemp; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command not found: ${command_name}" >&2
    exit 1
  fi
done

if ! git -C "${AI_PLATFORM_REPO}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "AI Platform repository not found: ${AI_PLATFORM_REPO}" >&2
  echo "Pass its path as the first argument or set AI_PLATFORM_REPO." >&2
  exit 1
fi

require_clean_worktree "${SOURCE_REPO}"
require_clean_worktree "${AI_PLATFORM_REPO}"

if ! git -C "${SOURCE_REPO}" rev-parse --verify "${SOURCE_REF}^{commit}" >/dev/null 2>&1; then
  echo "Source ref does not exist: ${SOURCE_REF}" >&2
  exit 1
fi

echo "==> Merge ${SOURCE_REF} into ${SOURCE_MAIN_BRANCH}"
git -C "${SOURCE_REPO}" fetch origin --prune
git -C "${SOURCE_REPO}" switch "${SOURCE_MAIN_BRANCH}"
git -C "${SOURCE_REPO}" pull --ff-only origin "${SOURCE_MAIN_BRANCH}"
git -C "${SOURCE_REPO}" merge --ff-only "${SOURCE_REF}"
git -C "${SOURCE_REPO}" push origin "${SOURCE_MAIN_BRANCH}"

echo "==> Prepare AI Platform branch ${SYNC_BRANCH} from origin/${TARGET_BRANCH}"
git -C "${AI_PLATFORM_REPO}" fetch origin --prune

TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/figma-text-naming-release.XXXXXX")"
WORKTREE="${TEMP_ROOT}/ai-platform"
WORKTREE_ADDED=0

cleanup() {
  if [[ "${WORKTREE_ADDED}" == "1" ]]; then
    git -C "${AI_PLATFORM_REPO}" worktree remove --force "${WORKTREE}" >/dev/null 2>&1 || true
  fi
  rmdir "${TEMP_ROOT}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git -C "${AI_PLATFORM_REPO}" worktree add -b "${SYNC_BRANCH}" "${WORKTREE}" "origin/${TARGET_BRANCH}"
WORKTREE_ADDED=1

DEST="${WORKTREE}/${SKILL_DEST_REL}"
mkdir -p "${DEST}"
rsync -a --delete \
  --exclude '/.git/' \
  --exclude '/.DS_Store' \
  --exclude '/automation/' \
  "${SOURCE_REPO}/" "${DEST}/"

if git -C "${WORKTREE}" diff --quiet && [[ -z "$(git -C "${WORKTREE}" status --porcelain)" ]]; then
  echo "No AI Platform changes to release."
  exit 0
fi

git -C "${WORKTREE}" add "${SKILL_DEST_REL}"
git -C "${WORKTREE}" diff --cached --check
git -C "${WORKTREE}" commit -m "chore(skills): sync figma-text-naming for test"
git -C "${WORKTREE}" push -u origin "${SYNC_BRANCH}"

SYNC_COMMIT="$(git -C "${WORKTREE}" rev-parse HEAD)"
git -C "${WORKTREE}" switch --detach "origin/${TARGET_BRANCH}"
git -C "${WORKTREE}" merge --no-ff "${SYNC_COMMIT}" -m "Merge branch '${SYNC_BRANCH}' into ${TARGET_BRANCH}"
git -C "${WORKTREE}" push origin "HEAD:${TARGET_BRANCH}"

echo "Released ${SYNC_COMMIT} to AI Platform ${TARGET_BRANCH}."
