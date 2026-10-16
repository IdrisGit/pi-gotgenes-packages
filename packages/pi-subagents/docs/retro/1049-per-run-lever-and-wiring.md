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

[#949]: https://github.com/gotgenes/pi-packages/issues/949
[#1050]: https://github.com/gotgenes/pi-packages/issues/1050
