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
