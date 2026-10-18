---
issue: 1079
issue_title: "pi-subagents: get_subagent_result reports \"No output.\" for an agent still queued behind maxConcurrent"
---

# Retro: #1079 — pi-subagents: get_subagent_result reports "No output." for an agent still queued behind maxConcurrent

## Stage: Planning (2026-10-18T03:33:18Z)

### Session summary

Reproduced the report through `GetResultTool.execute` with a disposable spike (queued agent behind a never-opened `gatedScheduler`), which surfaced three queued misstatements in one report: the `No output.` body, a bounded-wait note saying "still running" and "waiting again will not unstick it", and a `Duration` stat labeled `(running)`.
The operator scoped the fix to the body and the wait note, chose the "waiting for a concurrency slot (maxConcurrent)" wording, and deferred the `Duration` stat to [#1080], recorded as a new Phase 23 step after this one.
The plan is three code steps (a shared `queuedAgent()` test fixture, then two `fix:` steps) plus the landing doc step.

### Observations

- `createTestSubagent` defaults `result` to `"All done."` and `completedAt` to `2000`; the spike's first run rendered `All done.` for a queued agent, so the plan's fixture sets both to `undefined` and the new tests assert `not.toContain("No output.")`.
- The Tidy-First assessor recommended nothing; its optional `queuedAgent()` helper was folded in as Step 1 because Steps 2 and 3 would add the third and fourth copies of the inline queued setup.
- Rejected: a `queued` entry in `STATUS_MEANINGS` (it would change the `Status:` header and the foreground carriers' framing) and editing the `timeout` parameter description (general guidance in every parent's prompt; the per-report note overrides it for queued agents).
- Only `get_subagent_result` can observe a queued run: `foreground-runner.ts` and `agent-tool.ts` render after `await record.promise`, and the nudge fires on terminal status.

#### Deferred tidyings

- `src/tools/get-result-report.ts`: `renderReportBody` is a one-line pass-through to `renderOutcomeBody`, kept because `get-result-report.test.ts` calls it directly.

## Stage: Implementation — TDD (2026-10-18T03:46:09Z)

### Session summary

All four plan steps landed: the shared `queuedAgent()` fixture, the queued arm in `renderOutcomeBody`, the status-aware `renderWaitExpired`, and the architecture-doc landing.
The pi-subagents suite went from 2173 to 2179 tests (+6), and check, root lint, and `fallow dead-code` stayed green.

### Observations

- No deviations from the plan.
- Every killing mutation produced the reds the plan predicted: deleting the queued body arm turned all 4 Step 2 tests red, disabling the queued wait branch turned both Step 3 tests red, and inverting it also killed the existing running exact-text and `EXPIRY_NOTE` tests, so those really pin the running note byte for byte.
- The `&& false` mutation tripped `pi-autoformat`'s Biome `noConstantCondition` check; that is harmless for a temporary mutation, but a compared-literal mutation (`!==`) avoids the noise.
- Pre-completion reviewer: WARN.
  Its one finding: `architecture.md` line ~962 still describes the queued `No output.` body, but that is the Phase 23 sweep disposition explaining why this issue was filed, i.e. historical context, so it was left as is.
  The reviewer independently confirmed that only `get_subagent_result` can observe a queued run.

## Stage: Sync (worktree) (2026-10-18T15:51:41Z)

### Session summary

Pre-push `pnpm run lint` and `pnpm fallow dead-code` passed from the worktree root.
The plan's marker is `**Release:** ship independently`, with two `fix(pi-subagents):` commits (a patch); [#1080] (the queued agent's `Duration` stat) is filed and recorded as the next Phase 23 step, so it is not part of this land.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-1079--/2026-10-18T03-24-10-047Z_01a14d09-cbbe-70f9-ab6f-e6cb08c56636.jsonl` — read with `read_session_file({ path: "<path>" })` for message-level verification at land/retro time.

### Observations

- The one open item from the TDD stage (the reviewer's WARN on the historical sweep line in `architecture.md`) was settled there as non-blocking; nothing is carried to `/ship`.

[#1080]: https://github.com/gotgenes/pi-packages/issues/1080
