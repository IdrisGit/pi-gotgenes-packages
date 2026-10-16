---
issue: 1050
issue_title: "pi-subagents: run initial and resumed runs through one lifecycle"
---

# Retro: #1050 — pi-subagents: run initial and resumed runs through one lifecycle

## Stage: Planning (2026-10-16T04:39:30Z)

### Session summary

Planned Phase 23's Track A step 3: one turn loop, one run body, private terminal transitions, and a kind-carrying observer pair at both observer layers, plus the roadmap's ride-alongs.
The plan is `packages/pi-subagents/docs/plans/1050-one-run-lifecycle.md`, with 14 steps: eight preparatory `test:`/`refactor:` steps, one `fix:`, four `refactor:` steps, a grid re-nest, and the doc step.
It ships independently.
The baseline suite was 2116 tests in 86 files, all green at `12e693a6`.

### Observations

- The hold rule went the opposite way from the issue's expectation.
  The issue expected both kinds to follow the initial run's rule, which disposes a wrapped-up run that has a question.
  That rule lives only in [#1021]'s plan and one test, and that plan left it as an open question.
  `docs/configuration.md`, `README.md`, and `pi-subagents-worktrees/README.md` all describe hold.
  The operator chose hold for both kinds, so the `fix:` changes the initial run, and the resume twin is a pin that passes before the fix.
- Operator decisions at the gate (all three were the recommended options):
  - Hold the workspace for both kinds.
  - Collapse `SubagentManagerObserver` to `onSubagentRunStarted`/`onSubagentRunFinished(record, kind)`, so the events observer maps channels in one place.
  - The session owns its first run, and turn limits are resolved at creation through a pure `resolveTurnLimits`.
    The rejected alternative was a kind-discriminated `runTurnLoop` options union.
- Measured baselines differ from the roadmap's:
  - `mock.calls[` lines in `subagent.test.ts` are 16 (the roadmap says 19, from before [#1049]).
  - Top-level `describe` blocks number 37 (the roadmap says 36).
  - `fallow dupes` reports no clone between `src/` files; the remaining group is `subagent-state.ts` against a test helper.
- The Tidy-First assessor found traps the design summary missed.
  Each is now a plan step or guard:
  - Tests that resume from a finish observer would recurse once finishes carry both kinds.
  - Resume-only manager observers would double-count.
  - Resume stubs set before the initial spawn would be consumed by the initial run (step 8 stages them).
  - `resumeTurnLoop` tests on a never-run session would become first-run tests (step 7 primes them).
  - `buildObserver` wraps every callback except `onStarted` in `try`.
    The plan wraps both and pins the change with a test; production cannot observe it, because the composite already isolates each delegate.
- The resume prefix must stay synchronous up to the turn loop's first await (`startResume`'s claim).
  Step 11 adds an explicit pin for it.
- Sibling issue [#1058] (third-party, withheld notifications crossing a resume) touches `notification.ts`, which this plan does not change.
  It is left to [#1051]'s territory, and no disposition was recorded here.
- No follow-up issues filed.

#### Deferred tidyings

- `packages/pi-subagents/src/settings.ts`: `DEFAULT_WRAP_UP_TURNS` duplicates the constant step 9 moves into `turn-limits.ts`.
  Deduplicating it touches a file the change does not.
- `packages/pi-subagents/test/lifecycle/subagent-run.test.ts`: a `makeRun` helper for the 13 constructor sites was rated optional and not folded in.
- `packages/pi-subagents/test/lifecycle/subagent-manager.test.ts`: a `byRunKind` observer helper ahead of step 12's rename was rated marginal and not folded in.

[#1021]: https://github.com/gotgenes/pi-packages/issues/1021
[#1049]: https://github.com/gotgenes/pi-packages/issues/1049
[#1051]: https://github.com/gotgenes/pi-packages/issues/1051
[#1058]: https://github.com/gotgenes/pi-packages/issues/1058
