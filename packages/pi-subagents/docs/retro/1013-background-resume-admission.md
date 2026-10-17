---
issue: 1013
issue_title: "pi-subagents: a background resume is not admitted through maxConcurrent"
---

# Retro: #1013 — pi-subagents: a background resume is not admitted through maxConcurrent

## Stage: Planning (2026-10-17T22:42:18Z)

### Session summary

I planned the step that admits a background resume through the `ConcurrencyLimiter`, using the per-run object Phase 23 built.
The plan has eight steps.
It starts with a shared gated-scheduler test helper and a split of `continueSession` into birth and start.
It then adds an optional `RunScheduler` on `Subagent.resume`, makes `stopQueued` report the run's kind, and adds the breaking `resume-queued` refusal.
The last three steps cover the queued launch message, the manager admission `fix:`, and the docs.

### Observations

- A throwaway Vitest spike against the real manager and limiter, at `maxConcurrent: 1`, confirmed the defect.
  A background resume started while a spawn held the only slot and another spawn sat `queued`.
  The spike was removed.
- Operator decisions at the gate:
  - Every background resume queues (the tool's `run_in_background: true` resume and `SubagentsService.resume()`); a foreground tool resume bypasses.
  - A queued resume refuses a second resume with a new public member, `resume-queued`, which the operator preferred to reusing `still-running`.
    That makes step 5 `fix(pi-subagents)!:` and the release a major.
- The `tidy-first-assessor` recommended two preparations: the `beginResume`/`startResumedRun` split and a `gatedScheduler` test helper (5 copies, re-verified).
  It also found a hazard the design summary only half-covered.
  A stopped queued resume leaves the record resumable, so a record-level `isActive()` guard would let the stale thunk start a second turn loop.
  The guard must be on the run, and step 3 test (d) pins it.
- `limiter.schedule` starts a free-slot task synchronously, so a background resume below capacity still reads `running` when `startResume` returns.
  The limiter's extra microtask, and a slot freeing in `.finally` after the run's promise resolves, matter for the step 7 test arrangement at limit 1.
- Filed #1079: a queued agent's `get_subagent_result` body falls through to `No output.`.
  `roadmap-fit` recorded it as a new Phase 23 step after #1013, by operator decision (`02f4431b`).
- Accepted and not filed:
  - A service `resume()` awaiting a queued resume that `abort(id)` stopped resolves only when a slot frees, which is the same limiter semantics a stopped queued spawn already has.
  - The never-started wording for a stopped queued resume.
  - The `resumedWhileWaiting` sentence ("running again").
- Open question left in the plan: whether decision 0005 should state that widening a field's value union is semver-major.

#### Deferred tidyings

- `src/lifecycle/subagent.ts` `guardedRun`: the assessor rejected unifying it with the run-scoped resume guard; they guard different things.
