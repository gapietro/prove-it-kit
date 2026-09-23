#!/bin/sh
# prove-it pre-commit guard.
# Blocks (1) staged files the .gitignore allowlist doesn't admit (for example,
# force-added with `git add -f`) and (2) added lines that look like secrets.
# Fails closed: if a pattern is invalid, nothing is committed.
# Install:
#   cp <kit>/hooks/pre-commit-guard.sh "$(git rev-parse --git-path hooks)/pre-commit"
#   chmod +x "$(git rev-parse --git-path hooks)/pre-commit"
set -u
blocked=0
tmp=$(mktemp -d) || exit 1
trap 'rm -rf "$tmp"' EXIT

# Built-in secret shapes, matched case-sensitively. Each is written so this
# file's own text can't match it.
cat > "$tmp/builtin" <<'PATTERNS'
-----BEGIN [A-Z ]*PRIVATE KEY-----
(ghp|gho|ghs|ghu|ghr|github_pat)_[A-Za-z0-9_]{20,}
(^|[^A-Za-z0-9_-])sk-(proj-)?[A-Za-z0-9_]{20,}
AKIA[0-9A-Z]{16}
xox[abprs]-[A-Za-z0-9-]{10,}
https?://[^/[:space:]:@]+:[^/[:space:]@]+@
FAKE_TOKEN[=]do-not-use-
PATTERNS

# Local patterns (your hostname, your email), matched case-insensitively:
# .prove-it/patterns, never committed.
root=$(git rev-parse --show-toplevel)
: > "$tmp/local"
if [ -f "$root/.prove-it/patterns" ]; then
  grep -v -e '^#' -e '^[[:space:]]*$' "$root/.prove-it/patterns" > "$tmp/local"
fi

# Fail closed: an invalid pattern would make grep error and scan nothing.
check_patterns() {
  [ -s "$1" ] || return 0
  printf 'x\n' | grep -E -f "$1" > /dev/null 2>&1
  if [ $? -gt 1 ]; then
    printf 'BLOCKED: %s contains an invalid pattern, so nothing can be scanned. Fix it and commit again.\n' "$2" >&2
    exit 1
  fi
}
check_patterns "$tmp/builtin" "the guard's built-in list"
check_patterns "$tmp/local" ".prove-it/patterns"

# quotePath=false keeps non-ASCII names literal. Known limit: names containing newlines.
git -c core.quotePath=false diff --cached --name-only --diff-filter=ACMR > "$tmp/files"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  if git check-ignore -q --no-index -- "$f"; then
    printf 'BLOCKED: %s is not admitted by the .gitignore allowlist (force-added?).\n' "$f" >&2
    blocked=1
  fi
  # Only hunk content: the +++ header comes before the first @@, so an added
  # line that itself starts with ++ is still scanned.
  git -c core.quotePath=false diff --cached -U0 --no-color -- "$f" | sed -n '/^@@/,$p' | grep '^+' > "$tmp/added"
  n=$(grep -c -E -f "$tmp/builtin" "$tmp/added")
  if [ -s "$tmp/local" ]; then
    n=$((n + $(grep -c -i -E -f "$tmp/local" "$tmp/added")))
  fi
  if [ "$n" -gt 0 ]; then
    printf 'BLOCKED: %s has %s added line(s) that look like a secret.\n' "$f" "$n" >&2
    blocked=1
  fi
done < "$tmp/files"

if [ "$blocked" -ne 0 ]; then
  cat >&2 <<'MSG'

If any of this is a real credential: REVOKE or ROTATE it first.
Removing it from this commit does not un-leak it if it was ever pushed, pasted or copied.
Then unstage it (git restore --staged <file>), remove the secret, and commit again.
MSG
  exit 1
fi
exit 0
