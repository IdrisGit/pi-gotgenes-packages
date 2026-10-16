---
issue: 881
issue_title: "pi-permission-system: a path-surface ask's review entries and dialog carry no blame — flagged path and effect provenance never reach them"
---

# Retro: #881 — pi-permission-system: a path-surface ask's review entries and dialog carry no blame

## Stage: Planning (2026-10-16T15:20:30Z)

### Session summary

Planned four steps: a `refactor:` that adds `decidingPath: { path, effect, effectSource } | null` to `PromptRequestFacts` and lets the tolerant reader admit it; a `fix:` that has the two bash gates stamp it through `path-ask-payload.ts` and has `renderReviewLogFacts` render flat `decidingPath`/`effect`/`effectSource` keys; a `fix:` that adds a `why` core line to the dialog; and a `docs:` step.
The issue is the "declared-effects" batch tail, so `/ship` releases [#880] together with it.
The operator settled two design questions at the gate, and I posted a comment on [#952] at the operator's request.

### Observations

- Re-measured against the local review log: 331 bash `external_directory` `waiting` entries since 2026-09-05, none recording a path, and no entry in the whole log carrying an `effect` key.
  Since directional surfaces arrived (2026-08-27), 202 of 419 bash `external_directory` asks (48%) landed on the bare family, which is where the teaching sentence fires.
- The issue's example teaching sentence (`declare git log in commandEffects`) assumed the deciding path knows its command, and it doesn't.
  `PathToken` has no command field, and the resolver merges tokens from different commands into one path.
  The operator chose the generic sentence; naming the producing word is [#1062]'s mechanism.
- Tool path asks carry `decidingPath: null` (operator decision).
  The operator asked whether Pi 1.2.0's `reachesTools` mattered here.
  I traced it: it names the *tools* a `codemode`/`tool_search` call can reach, says nothing about filesystem direction, and nested calls are already gated one by one.
  The adjacent `ToolAnnotations.readOnlyHint` (since Pi 0.99.0) is the only SDK signal of a tool's direction.
  It is the tool's own self-description, so treating it as proof would be self-granted relief; I recorded it on [#952] as a design input.
  I first misidentified the operator's "Pi 1.3.0 tool" reference as `ToolCall.argumentsError`; the operator corrected it to 1.2.0's `reachesTools`.
- The review-log key is `decidingPath`, not `path`, because `PermissionPrompter` writes `path: details.path ?? null` after spreading the payload facts, which would overwrite it.
  Flat `effect`/`effectSource` keep the runner-written entries' existing key names.
- The Tidy-First assessor (sonnet-5-5) recommended no preparatory commit.
  It caught three things:
  - The design passed a `TokenEffect` where `DecidingPath` expected a flat `effect`.
    The plan now flattens once, in a `decidingPathFact` helper in `path-ask-payload.ts`, which also makes the roadmap's `effectSource` metric read 1.
  - `buildExternalDirectoryAskPayload` has only tool callers, so it gains no new input.
  - A `tool.ts` doc comment credits the `logContext` routing this change removes.
- Accepted risk: when two attributions of one path disagree (`cat a > a`), the fold gives `{unproven, unproven}`, so the dialog suggests a declaration that wouldn't change that outcome.
- No follow-up issues were filed.
  The `codemode`/`tool_search` exposure check was offered and not requested.

#### Deferred tidyings

- `src/presentation/prompt-payload.ts`: the local enum lists (`BASH_COMMAND_CONTEXTS`, and now the effect lists) use `satisfies readonly T[]`, which does not check exhaustiveness; exporting the value lists from `access-intent/effect.ts` was rated optional and skipped.

[#880]: https://github.com/gotgenes/pi-packages/issues/880
[#952]: https://github.com/gotgenes/pi-packages/issues/952
[#1062]: https://github.com/gotgenes/pi-packages/issues/1062
