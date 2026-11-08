#!/usr/bin/env bash
# scommit: commit all changes as "scripted commit #N" and push.
# Usage: scommit            -> "scripted commit #3"
#        scommit "new tiles" -> "scripted commit #3: new tiles"
set -euo pipefail

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Not inside a git repository." >&2; exit 1; }
cd "$root"

push() {
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    git push
  else
    git push -u origin HEAD
  fi
}

# Nothing new? Still push any commits that never made it to GitHub.
if [ -z "$(git status --porcelain)" ]; then
  ahead=$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)
  if [ "$ahead" -gt 0 ]; then
    echo "No new changes, but $ahead commit(s) not pushed yet. Pushing."
    push
  else
    echo "Nothing to commit."
  fi
  exit 0
fi

n=$(( $(git rev-list --count HEAD 2>/dev/null || echo 0) + 1 ))
msg="scripted commit #$n"
if [ $# -gt 0 ]; then
  msg="$msg: $*"
fi

git add -A
git status --short
git commit -q -m "$msg"
echo "Committed: $msg"
push
