# [inputs] intake — Promote echo-forum brief into project/

**Status:** IN_PROGRESS
**Stage:** Stage 1 — Intake
**Phase:** Pre-planning (intake)
**Agent:** architect
**Skills active:** workflow-ship-faster, git-workflow
**Started:** 2026-04-18
**Completed:** —

---

## Approach

### What will be built
- Branch `docs/echo-forum-intake` off `master` (done).
- `project/BRIEF.md` populated from `module-briefs/echo-forum/BRIEF.md`.
- `project/REQUIREMENTS.md` populated from `module-briefs/echo-forum/REQUIREMENTS.md`.
- Empty sections of `project/CONSTRAINTS.md` (MVP Definition, Explicitly Out of Scope, Stack Locks, Timeline) populated from echo-forum CONSTRAINTS + TECH-STACK.
- Generic security/quality-gate content in `project/CONSTRAINTS.md` preserved unchanged.
- `project/CONVENTIONS.md` left untouched — echo-forum provides no convention content; separate task.

### Why this approach (over alternatives considered)
- CLAUDE.md directs `/plan` to read `project/*.md` as the primary source of truth. Empty templates there will produce a degenerate plan.
- Echo-forum brief is fully MoSCoW-specified; promoting it into `project/` is a copy-with-light-adaptation, not a new authoring task.
- `module-briefs/echo-forum/CONSTRAINTS.md` explicitly *extends* `project/CONSTRAINTS.md`. Both files coexist; do not merge the forum-specific overlay into the project file.

### Files that will be created or modified
| File | Action | Reason |
|---|---|---|
| `logs/inputs/intake-echo-forum-project-files.md` | create | Task log |
| `project/BRIEF.md` | overwrite | Empty template → filled |
| `project/REQUIREMENTS.md` | overwrite | Empty template → filled |
| `project/CONSTRAINTS.md` | edit sections | Fill empty MVP/Scope/Stack/Timeline blocks |

### Assumptions made
- `module-briefs/echo-forum/` is the authoritative source for module scope.
- Forum is the sole module being built in this repo (single-module SKEP build, not a multi-module monorepo at this time).
- T+0 of the hackathon clock is not yet pinned; leaving as "to be provided" until user confirms.
- No Figma link yet — brief explicitly allows placeholder references.

### Risks identified
- If the user intended `project/` files to remain empty and keep `module-briefs/echo-forum/` as the sole source, this change is wrong direction. Mitigation: branch is isolated; can revert.
- Five unresolved gap questions remain (platform-core scaffolding ownership, Figma link, T+0 clock, conventions authoring, single-vs-multi-module repo). These block `/plan` correctness, not this intake.

---

## Your Input

*(no input required for this task)*

---

## Execution

**Status:** IN_PROGRESS — 2026-04-18

### Steps taken
1. Read all `project/`, `module-briefs/echo-forum/`, `.claude/CLAUDE.md`, and `docs/` context.
2. Created branch `docs/echo-forum-intake` from `master`.
3. Created this log.
4. (pending) Write `project/BRIEF.md`.
5. (pending) Write `project/REQUIREMENTS.md`.
6. (pending) Edit `project/CONSTRAINTS.md` empty sections.

### Files created / modified
- `logs/inputs/intake-echo-forum-project-files.md` (this file)

### Commands run

```bash
git checkout -b docs/echo-forum-intake
```

### Errors encountered and fixes applied
- none

### Mid-task decisions made
- Not committing at end of intake — user asked for branch + fill only, not commit. Leaving working tree dirty for user review.
- Not touching `project/CONVENTIONS.md` — no echo-forum source content for it; separate task.

---

## Summary

*(to be filled when task closes)*
