#!/bin/sh
# Tests for hooks/pre-commit-guard.sh.   Run: sh tests/guard.test.sh
# Sabotage check (must FAIL): GUARD=tests/fixtures/always-pass-guard.sh sh tests/guard.test.sh
# Every test secret is built at runtime with printf octal escapes, so this file
# never contains a literal secret shape (\075 is '=', \137 is '_', \072 is ':', \040 is a space).
set -u
KIT=$(cd "$(dirname "$0")/.." && pwd)
GUARD=${GUARD:-$KIT/hooks/pre-commit-guard.sh}
case "$GUARD" in /*) ;; *) GUARD="$KIT/$GUARD" ;; esac
pass=0; fail=0
R=''
# Each case makes a temp repo; remove the previous one and the last one on exit.
cleanup() { if [ -n "$R" ]; then rm -rf "$R" "$R.out"; fi; }
trap cleanup EXIT
ok()  { pass=$((pass + 1)); printf 'ok   %s\n' "$1"; }
bad() { fail=$((fail + 1)); printf 'FAIL %s\n' "$1"; }

new_repo() {
  cleanup
  R=$(mktemp -d)
  git -C "$R" init -q -b main
  git -C "$R" config user.email test@example.invalid
  git -C "$R" config user.name test
  git -C "$R" config commit.gpgsign false
  printf '/*\n!/.gitignore\n!/src/\n' > "$R/.gitignore"
  mkdir -p "$R/src"
  hooks=$(git -C "$R" rev-parse --git-path hooks)
  case "$hooks" in /*) ;; *) hooks="$R/$hooks" ;; esac
  cp "$GUARD" "$hooks/pre-commit" && chmod +x "$hooks/pre-commit"
}

# expect_block NAME PATH CONTENT [extra git-add flag] [SECRET TOKEN that must not be printed; default CONTENT]
expect_block() {
  new_repo
  printf '%s\n' "$3" > "$R/$2"
  git -C "$R" add ${4:-} -- .gitignore "$2" 2>/dev/null
  if git -C "$R" commit -q -m t > "$R.out" 2>&1; then
    bad "$1 (commit was allowed)"
  elif ! grep -qi 'revoke' "$R.out"; then
    bad "$1 (blocked, but no revoke-first message)"
  elif grep -qF -- "$3" "$R.out" || grep -qF -- "${5:-$3}" "$R.out"; then
    bad "$1 (blocked, but the secret was printed)"
  else
    ok "$1"
  fi
}

# expect_pass NAME PATH CONTENT
expect_pass() {
  new_repo
  printf '%s\n' "$3" > "$R/$2"
  git -C "$R" add -- .gitignore "$2"
  if git -C "$R" commit -q -m t > "$R.out" 2>&1; then ok "$1"; else bad "$1 (blocked: $(head -2 "$R.out"))"; fi
}

expect_pass  "clean allowed file passes"        src/app.js 'export const x = 1;'
expect_pass  "ordinary word 'token' passes"     src/app.js 'const tokenBudget = 20; // token budget'
expect_block "planted test marker is blocked"   src/app.js "$(printf 'FAKE\137TOKEN\075do-not-use-0000')"
expect_block "GitHub token shape is blocked"    src/app.js "$(printf 'const t = "ghp\137ABCDEFGHIJKLMNOPQRSTUVWX0123";')" '' \
  "$(printf 'ghp\137ABCDEFGHIJKLMNOPQRSTUVWX0123')"
expect_block "private key header is blocked"    src/key.txt "$(printf -- '-----BEGIN RSA PRIVATE\040KEY-----')"
expect_block "credentials in a URL are blocked" src/app.js "$(printf 'https://admin\072hunter22@example.invalid/x')" '' \
  "$(printf 'admin\072hunter22')"
expect_block "force-added outside allowlist"    notes.txt 'meeting notes' -f
expect_block "API key shape is blocked"         src/app.js "$(printf 'const k = "sk\055abcdefghijklmnopqrstuvwx1234";')" '' \
  "$(printf 'sk\055abcdefghijklmnopqrstuvwx1234')"
expect_pass  "kebab-case names pass"            src/app.css '.x { mask-image-linear-gradient: none; } /* risk-assessment-service-module */'
expect_pass  "lowercase look-alikes pass"       src/app.js 'const s = "akiaabcdefghijklmnop";'

# Non-ASCII file names (git quotes them unless core.quotePath=false); \303\251 is 'é'
CAFE=$(printf 'src/caf\303\251.js')
expect_pass  "clean non-ASCII file name passes" "$CAFE" 'export const x = 1;'
new_repo
printf 'FAKE\137TOKEN\075do-not-use-0000\n' > "$R/$CAFE"
git -C "$R" add -- .gitignore "$CAFE"
if git -C "$R" commit -q -m t > "$R.out" 2>&1; then bad "secret in a non-ASCII file name is blocked (commit was allowed)"
elif grep -q 'look like a secret' "$R.out"; then ok "secret in a non-ASCII file name is blocked"
else bad "secret in a non-ASCII file name is blocked (blocked, but not scanned: $(head -1 "$R.out"))"; fi

# Local patterns from .prove-it/patterns
new_repo
mkdir -p "$R/.prove-it"; printf '# comment\nmy-instance-name\n' > "$R/.prove-it/patterns"
printf 'see my-instance-name\n' > "$R/src/app.js"
git -C "$R" add -- .gitignore src/app.js
if git -C "$R" commit -q -m t > "$R.out" 2>&1; then bad "local pattern is blocked (commit was allowed)"; else ok "local pattern is blocked"; fi

# Local patterns match case-insensitively
new_repo
mkdir -p "$R/.prove-it"; printf 'my-instance-name\n' > "$R/.prove-it/patterns"
printf 'see MY-INSTANCE-NAME\n' > "$R/src/app.js"
git -C "$R" add -- .gitignore src/app.js
if git -C "$R" commit -q -m t > "$R.out" 2>&1; then bad "local patterns ignore case (commit was allowed)"; else ok "local patterns ignore case"; fi

# A modified (already committed) file that gains a secret is blocked
new_repo
printf 'export const x = 1;\n' > "$R/src/app.js"
git -C "$R" add -- .gitignore src/app.js
if ! git -C "$R" commit -q -m first > "$R.out" 2>&1; then bad "modified file gaining a secret is blocked (first commit failed)"
else
  printf 'FAKE\137TOKEN\075do-not-use-0000\n' >> "$R/src/app.js"
  git -C "$R" add -- src/app.js
  if git -C "$R" commit -q -m second > "$R.out" 2>&1; then bad "modified file gaining a secret is blocked (commit was allowed)"
  elif grep -q 'look like a secret' "$R.out"; then ok "modified file gaining a secret is blocked"
  else bad "modified file gaining a secret is blocked (blocked for another reason)"; fi
fi

# An invalid local pattern must fail closed, not open
new_repo
mkdir -p "$R/.prove-it"; printf 'foo(\n' > "$R/.prove-it/patterns"
printf 'harmless\n' > "$R/src/app.js"
git -C "$R" add -- .gitignore src/app.js
if git -C "$R" commit -q -m t > "$R.out" 2>&1; then bad "invalid local pattern fails closed (commit was allowed)"
elif grep -qi 'invalid pattern' "$R.out"; then ok "invalid local pattern fails closed"
else bad "invalid local pattern fails closed (blocked without explanation)"; fi

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
