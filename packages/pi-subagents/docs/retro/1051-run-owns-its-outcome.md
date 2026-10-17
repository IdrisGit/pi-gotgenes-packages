---
issue: 1051
issue_title: "pi-subagents: let each run own its outcome, so a waiter holds the run it waited on"
---

# Retro: #1051 — pi-subagents: let each run own its outcome, so a waiter holds the run it waited on

## Stage: Planning (2026-10-17T04:18:54Z)

### Session summary

Planned moving one run's outcome (status, result, timestamps, question, notice, turn budget, update ledger, consumption, claims) from `SubagentState` onto `SubagentRun`, with `waitUntilSettled` returning the run it waited on.
The plan is eleven steps: a sweep ride-along, four Tidy-First preparations (initial run from construction, no production status seed, explicit fixture seeds, a temporary superseded-slot scaffold on `Subagent`), five field-move slices, and a docs step.
Operator gate: #1058 stays separate, a replaced run tracks its own fate (`markReplaced`), and the sweep tests use fake timers on the real interval.

### Observations

- `SubagentState` does not dissolve: `test/service/service-adapter.test.ts` passes `new SubagentState({ lifetimeUsage })`, and the issue requires the service tests to pass unedited, so it keeps the cross-run metrics, activity, and `lastProgressAt`.
- The design forced a split of `SubagentRun`'s birth from its start: a queued background agent can be claimed by a `wait: true` before its slot opens, so the initial run must exist from `Subagent` construction.
  This is also what [#1013]'s queued resume needs.
- The waiter now marks the waited run consumed even when a resume replaced it (today it releases and marks nothing); argued unobservable because every reader reads the current run.
- `workspaceNotice` and `stoppedWhileQueued` were never cleared by `resetForResume`; per-run they start empty, argued unobservable because a record holding either refuses every resume.
- The Tidy-First assessor found that transitions must target the run they receive: an aborted run whose turn loop is still unwinding when a resume starts would otherwise write its late completion onto the resume.
  Reachability through a front door was not verified; step 7 says to retype it `fix:` if the implementing session finds it reachable.
- The assessor also caught that both test fixtures forward seeds through a rest spread, so a key leaving `SubagentStateInit` would drop silently at runtime; step 4 partitions them first.
- Spike (deleted): fake `setInterval` plus the existing `Date.now` spy drove the real sweep, and a `process.getActiveResourcesInfo()` timer count replaced `hasRef()`; deleting `unref()` turned it red.
  Changing the interval to 120 s did not kill the sweep test (two 60 s advances reach it), so the plan's sweep mutation empties the callback instead.
- Foreground carriers (`foreground-runner.ts`, the foreground resume) still mark `record.markConsumed()` after awaiting; same trigger class as [#1015], unreachable in-repo, recorded as a Non-Goal with no issue filed.
- Measured baselines: `_superseded` 3, `resetForResume` 8, `as any` in `subagent-manager.test.ts` 8, `lifecycle/subagent.ts` 846 lines, `fallow dupes` one 21-line group (`subagent-state.ts` with `make-subagent.ts`), dead code 0.

#### Deferred tidyings

- `packages/pi-subagents/test/lifecycle/subagent.test.ts`: migrating `makeSubagent` (70 sites) onto `createTestSubagent` declined; the defaults differ (queued versus completed).
- `packages/pi-subagents/src/lifecycle/subagent.ts`: the ~15 one-line read-through getters stay; a generic delegating proxy was judged a wrong-abstraction risk.

[#1013]: https://github.com/gotgenes/pi-packages/issues/1013
[#1015]: https://github.com/gotgenes/pi-packages/issues/1015
