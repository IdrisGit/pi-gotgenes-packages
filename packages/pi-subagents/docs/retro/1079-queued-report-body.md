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

[#1080]: https://github.com/gotgenes/pi-packages/issues/1080
