# Setup checklist

Tick every box before you start a build (or a recording) with the prove-it kit.

## Environment

- [ ] **A clean environment.** A separate OS user, or a fresh machine or VM,
      with only public tools installed: no private plugins, no private skills,
      no personal `~/.claude/CLAUDE.md`, no saved memory from other work.
      What the viewer sees must be what the kit does on its own.
- [ ] **Node ≥ 18** (`node --version`).
- [ ] **Claude Code installed** (`claude --version`).
- [ ] **GitHub CLI signed in**: `gh auth login` done, and `gh auth status` is green.
- [ ] **now-sdk installed** and `now-sdk auth --add <instance> --alias <alias>`
      done. Check with `now-sdk auth --list`.
- [ ] **Credentials set up off camera, and never shown.** Do `gh auth login`
      and `now-sdk auth` before recording, with the screen off or not shared.
      Never show `now-sdk auth --list` output, a token, a password or an
      instance hostname on screen or in a file you commit.
- [ ] **The kit installed** in Claude Code:
      ```
      /plugin marketplace add <owner>/prove-it-kit
      /plugin install prove-it@prove-it
      ```
- [ ] **A PDI awake**: log in to your personal developer instance in a browser
      so it is not hibernating when the build installs.
- [ ] **A workspace folder with `brief/`** holding exactly one brief, written
      from `templates/BRIEF.md`. The app repo is created inside this folder
      later; `CONSULT.md`, `plan.json` and drill cards stay in the workspace,
      outside the repo.
- [ ] **The guard installed** in the app repo once it exists (see the README,
      "The guard").

## The handoff drill (`/prove-it:handoff diagnose`)

The drill only proves something if the diagnose session knows nothing but the
runbook.

- [ ] **Open the diagnose session with auto-memory off**, or from a **second
      clone** inside the workspace (for example `<workspace>/diagnose/`, so `..`
      is still the workspace). A clone must include the current `RUNBOOK.md`.
  - Auto-memory off for one session: start Claude Code with the environment
    variable `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`
    (e.g. `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 claude`).
  - Or for the project: set `"autoMemoryEnabled": false` in the project's
    Claude Code settings.
  - Both names checked against Claude Code 2.1.280; check them again against
    the version you record below.
  - Auto-memory off does **not** stop `CLAUDE.md` files from loading. That is
    one more reason to record as a separate OS user with no personal
    `~/.claude/CLAUDE.md`.
- [ ] **`diagnose` is the first thing asked** in that session: run
      `/prove-it:handoff diagnose <symptom>` before reading, pasting or asking
      anything else.
- [ ] **Someone else plants the failure** if you can, from the drill card, on
      the test instance only.

## Record your versions

Fill this in on the day you record, so viewers can reproduce the run.

| Tool | Version | How to check |
|---|---|---|
| Claude Code | | `claude --version` |
| Model | | `/model` in Claude Code |
| Node | | `node --version` |
| now-sdk | | `now-sdk --version` |
| gh | | `gh --version` |
| gitleaks | | `gitleaks version` |
| prove-it | | `/plugin` (installed version) |
