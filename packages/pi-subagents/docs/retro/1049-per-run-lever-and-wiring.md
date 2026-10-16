---
issue: 1049
issue_title: "pi-subagents: give each run its own abort lever, signal wiring, and session subscription"
---

# Retro: #1049 — pi-subagents: give each run its own abort lever, signal wiring, and session subscription

## Stage: Planning (2026-10-16T01:54:04Z)

### Session summary

Planned Phase 23's Track A step 2: a per-run `SubagentRun` that owns the abort controller, caller-signal wiring, and record-observer unsubscribe, with [#949] folded in.
The plan is `packages/pi-subagents/docs/plans/1049-per-run-lever-and-wiring.md`: five steps (a preparatory `test:`, the `refactor:` extraction, two `fix:` steps, and the roadmap mark), shipping independently.
A disposable Vitest spike against the real `Subagent` and `SubagentSession` measured four scenarios before the design gate, then was deleted.

### Observations

- The spike found a reachable trigger wider than [#949]'s: `abort(id)` while `createSubagentSession` is pending leaves a `stopped` record whose child still runs a full turn loop, because the turn loop's `forwardAbortSignal` registers on an already-aborted signal.
- [#949]'s proposed fix for `forwardAbortSignal` (call `session.abort()` immediately) would not work.
  Pi's `AgentSession.abort()` ends in `agent.abort()`, which is `activeRun?.abortController.abort()`, a no-op with no active run (read in the pinned 1.0.0 compiled `dist/`, unchanged on `main`).
  The loop must skip `prompt()` instead.
- Operator decisions at the gate:
  - A spawn whose signal has already fired stops before workspace preparation (option A).
    Rejected alternatives: stop only at the turn loop (B), or check at every setup boundary (C).
  - A turn loop given a fired signal skips the prompt, returns `""`, and still emits `subagents:child:completed`.
    Rejected alternative: throw.
- Classified as not breaking: `SpawnConfig.signal`, `ResumeOptions.signal`, and the README already promise the cancellation.
- The born-aborted branch aborts the run's own controller rather than calling `onCallerAbort`.
  A callback during construction would run `Subagent.abort()` before `currentRun` is assigned and pull the previous run's lever.
- The Tidy-First assessor recommended the leading `test:` step and confirmed the design's ordering claim.
  The step migrates eight `abortController` reads; two of them (around lines 346 and 1772) call `abort()` on a never-run record, so they need a real parked `run()` rather than a swap.
  It also flagged three doc comments in `subagent.ts` for the extraction commit.
- Found while planning: no test pins the record-observer unsubscribe at run end, so step 1 adds one; otherwise step 2's relocated `attachObserver` call would be unpinned.
- No follow-up issues filed.

#### Deferred tidyings

- `packages/pi-subagents/src/lifecycle/subagent.ts`: a shared `beginRun(signal)` helper was re-rejected.
  After construction the two sites diverge: `run()` has its own early terminal, and `runResume()` has `onResumeStarted` between the check and the observer attach.
- `packages/pi-subagents/src/lifecycle/subagent-session.ts`: merging the `runTurnLoop`/`resumeTurnLoop` tails was rejected as [#1050]'s scope.
- `packages/pi-subagents/src/lifecycle/subagent.ts`: a `private observe(session)` extraction for the duplicated `subscribeSubagentObserver` call was rated optional and not folded in.

## Stage: Implementation — TDD (2026-10-16T02:20:24Z)

### Session summary

All five plan steps landed as five commits, plus two review follow-ups (a `docs:` correction to the [#1050] roadmap entry and a `test:` pin), each its own commit.
The five steps were: the preparatory `test:` migration, the `SubagentRun` `refactor:`, two `fix:` steps, and the roadmap mark.
The pi-subagents suite went from 2100 to 2116 tests in 86 files (the plan estimated about 2116).
Pre-completion reviewer: WARN on the first round, PASS on the delta.

### Observations

- Every killing mutation behaved as predicted.
  Each step-3 mutation (remove the guard, stale fallback text, `failIfProviderErrored` on the skipped path, guard below `enforceTurnBudget`, drop `completed`) killed exactly its own class.
  Step 4's "move the check below workspace preparation" killed only the provider test, as planned.
- Deviation: step 3 put the fired-signal guard in one private `promptForAnswer` helper that both loops share, rather than duplicating it.
  That removed the `runTurnLoop`/`resumeTurnLoop` production clone group the roadmap had assigned to [#1050]; `fallow dupes` now reports only a `subagent-state.ts`/test-helper group.
  `lifecycle.completed` now fires after the listener cleanup rather than before it; the reviewer confirmed nothing observes that order.
- Deviation: step 2 deleted one constructor test, not two; the other also asserted zeroed stats, so only its `abortController` line went.
- The plan's resume born-aborted test could not use `parkLoopUntilSignalled`: a stub parked on an already-fired signal never resolves, because its `abort` listener never fires.
  The test captures `abortedAtEntry` from a resolving stub instead.
- The step-3 `fix:` subject was reworded before review, from the turn-loop seam to the observable outcome ("an abort that lands while a child is starting stops it before its first turn"), with a scripted reword rebase; the tree diff against a backup tag was empty.
- `lifecycle/subagent.ts` grew from 834 to 850 lines; the phase's ≤ 700 target rests on [#1050] and [#1051].
- Reviewer warnings (round 1), both fixed and confirmed by the delta round:
  - The [#1050] roadmap entry still described the clone group this change removed.
  - No test covered a caller signal that fires during `onStarted`.

[#949]: https://github.com/gotgenes/pi-packages/issues/949

## Stage: Sync (worktree) (2026-10-16T02:54:29Z)

### Session summary

`pnpm run lint` and `pnpm fallow dead-code` both pass on the branch, ahead of the rebase onto local `main`.
The plan's `**Release:**` marker is `ship independently`, and the branch carries two `fix:` commits, so `/ship` should cut a patch release for `@gotgenes/pi-subagents`; no follow-up issues were filed.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-1049--/2026-10-16T00-49-55-464Z_01a1422f-dd05-776f-8c72-a90291eb9369.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

- The reviewer's WARNs were both settled before this stage, so nothing was left open at sync.

[#1050]: https://github.com/gotgenes/pi-packages/issues/1050
[#1051]: https://github.com/gotgenes/pi-packages/issues/1051
