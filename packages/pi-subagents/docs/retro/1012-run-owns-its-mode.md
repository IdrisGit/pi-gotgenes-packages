---
issue: 1012
issue_title: "pi-subagents: an agent spawned in the foreground and resumed in the background has no widget row"
---

# Retro: #1012 — pi-subagents: an agent spawned in the foreground and resumed in the background has no widget row

## Stage: Planning (2026-10-16T15:10:25Z)

### Session summary

Planned the Phase 23 step that makes a run's mode a fact of the run: `SubagentRun` carries `inBackground`, and `Subagent.isBackground` (and the public `SubagentRecord.isBackground`) reports the current run's mode.
The plan has eight steps: four preparatory `test:`/`refactor:` steps from the Tidy-First assessment, a widget linger `fix:`, the breaking mode `fix!:`, a `feat:` that streams a foreground resume inline, and docs.
Plan: `packages/pi-subagents/docs/plans/1012-run-owns-its-mode.md`.

### Observations

- Operator decisions at the gate:
  - `SubagentRecord.isBackground` reports the current run's mode, a breaking change (`fix(pi-subagents)!:`).
    I had recommended keeping the spawn-time meaning; the operator answered with a question ("the run becomes prominent; agree?"), and after the trade-offs were laid out chose current state and accepted the major.
  - A foreground tool resume gains the inline `onUpdate` progress stream a foreground spawn has (option "2b"), so ADR 0004 Decision A's "foreground runs render inline" holds for resumes and the widget can trust the run's mode.
  - `SubagentsService.resume()` always resumes in the background, matching the SDK spawn door's default; no new public option.
  - The widget linger defect is folded in as its own `fix:` step.
  - The four preparatory commits land as leading steps in this plan rather than a separate issue.
- The linger defect was found by a throwaway Vitest spike against the real `AgentWidget` (since deleted): `finishedTurnAge` is never cleared when a record runs again, so a second run's finished row clears at settle.
  Observed widget content across finish, turn, resume start, resume finish: `function, undefined, function, undefined`.
  It has affected every background resume since #987.
- `ResumeCallOptions.background` is required, following `AgentSpawnConfig.background`'s precedent, which costs mechanical edits at about 25 manager calls and about 35 `agent.resume(` calls; the assessor rejected wrapper helpers to absorb them.
- The Tidy-First assessor's report had one wrong count: it said one test passes a signal to `agent.resume`, and there are three (`subagent.test.ts` lines ~1426, ~1969, ~2029).
  The plan tells the implementer to re-derive counts per step.
- Step 3 (foreground tool resume through `startResume`) makes six `agent-tool.test.ts` assertions that discriminate the doors by method identity ambiguous; the plan requires argument assertions only one door satisfies.
- A service spawn with `foreground: true` already has neither a widget row nor an inline stream; recorded as a Non-Goal, not filed.
- No follow-up issues were filed, so `roadmap-fit` did not run.

#### Deferred tidyings

- `src/tools/agent-tool.ts` `resumeExisting`: the `signal ?? new AbortController().signal` fallback, unrelated to the mode change.

## Stage: Implementation — TDD (2026-10-16T15:49:39Z)

### Session summary

All eight plan steps landed, each with its named killing mutations applied and observed red, plus four follow-up commits from the pre-completion review.
`SubagentRun` now carries its mode, `isBackground` reports the current run's mode (the breaking `fix(pi-subagents)!:`), a foreground resume streams inline progress through the extracted `startProgressStream`, and a resumed run's finished widget row lingers.
The pi-subagents suite went from 2142 to 2163 tests (+21).

### Observations

- Deviation, step 4: `Subagent.resume`'s options parameter took a temporary `= {}` default so only the three signal-passing calls changed; step 6 removed it when `background` became required, so the 34 no-signal calls were edited once rather than twice.
- Deviation, step 6: the 78 typed call sites `tsc` reported were edited by a line-targeted script (calls with `claimOutcome: true` got `background: false`, the rest `background: true`); the untyped exact assertions in `agent-tool.test.ts` and `service-adapter.test.ts` surfaced only in the full-suite run, as the plan predicted.
- Deviation, step 7: I first dropped the plan's `finally` on the claim that `Subagent.promise` always resolves; the reviewer traced a narrow residual (an observer subscription or observer throw outside `runOnSession`'s try) and the `finally` was restored in a follow-up `refactor:` commit to match `runForeground`.
  The reject-path mutation stays unwritten, since no reachable input rejects today.
- The plan's Module-Level Changes missed the `package-pi-subagents` skill's domain table; its file count (stale at 72 before this change, 73 measured) and the Tools row now read 74 and 11.
- The Tidy-First assessor's signal-call count (1) was wrong; there were 3, as the planning note warned.
- Every step-6 mutation killed its predicted set, and the fallback mutation (`?? true`) also killed the widget's background-only filtering tests, which build passive records.
- Pre-completion reviewer: WARN (round 1: a garbled widget doc comment, the dropped `finally`, a stale `fix:` commit type in the roadmap), WARN (round 2: the "whatever mode it was spawned in" wording in two places), then PASS (round 3).

## Stage: Sync (worktree) (2026-10-17T02:39:03Z)

### Session summary

`pnpm run lint` and `pnpm fallow dead-code` both pass on the worktree.
The plan's marker is `**Release:** ship independently`, and the breaking `fix(pi-subagents)!:` commit carries its `BREAKING CHANGE:` footer, so `/ship` should dispatch a major release for `pi-subagents`; no follow-up issues were filed, and #1013 and #1051 stay open as the roadmap's next steps.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-1012--/2026-10-16T05-54-22-834Z_01a14346-99f1-77ac-ba5d-7e561de46cad.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

The Tidy-First deferral (`resumeExisting`'s `signal ?? new AbortController().signal` fallback) is unchanged and unfiled by design.
