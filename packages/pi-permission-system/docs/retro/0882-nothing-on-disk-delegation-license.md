---
issue: 882
issue_title: "pi-permission-system: decide whether a chain link may dismiss an external_directory ask for a token that names nothing on disk (ADR 0007 §5)"
---

# Retro: #882 — decide whether a chain link may dismiss an external_directory ask for a token that names nothing on disk

## Stage: Planning (2026-10-17T04:03:25Z)

### Session summary

Deliberated the ADR 0007 §5 question with the operator and planned the amendment plus the checkpoint change.
The operator accepted the narrow bound: a link may `allow` a bash `external_directory` ask when every uncovered path names nothing on disk below the filesystem root and none is a proven write.
The plan has six steps: ADR §8, the normalizer probe and gate license, the wire, a fixture prep, the `feat!:` checkpoint change, and docs.

### Observations

- Gate decisions: bound = "unrooted, not a proven write" (rejected: leaf-absent, which admits `mkdir -p ~/new`; proven-read-and-absent, which relieves almost nothing because an undeclared tool is always `unproven`; rejection of the change outright).
  PR [#983]'s per-link `authorizerTrust` is named in the amendment as a different question and left parked on [#620] / [#799]; comment on it at ship time.
  Land now as `feat!:`, because it loosens the documented "caps any link's `allow` on `external_directory`" guarantee without a user edit.
- Measured against the local review log, with disposable scripts since deleted: 13 of 617 message-era bash ext-dir asks and 18 of 429 re-projected recent asks have every flagged path unrooted; all 31 are non-path tokens (`gh api` routes, slash commands, `git log -L` ranges, commit prose, regex).
  The recent 18 carried 18 `unproven` and 1 `core` effect.
  Post-#746 `waiting` entries carry no paths, so the recent set had to be re-projected through `BashProgram.parse` with an assumed cwd; existence is probed now, not at ask time.
- The issue attributed "the judge absorbs the surplus" to ADR 0013 §7; the sentence lives in ADR 0009's layering principle (restated in the architecture doc), with §7 narrowing the chain's role to judgment.
- PR [#684] was already closed by its author, so the issue's "close PR #684" step is moot.
- The allow-capable third-party `pi-permission-classifier` (0.5.2) skips the `path`/`external_directory` families itself, mirroring our cap, and `model-judge` never allows — so the change has no in-tree consumer on day one; the license is visible on `details.accessIntent` for a link to adopt.
- Design departure from the issue: the fact lives on `ForwardedAccessFacts` only, not also the `PromptPayload` request core; the audit line is a dedicated `authorizer_allow_licensed` record written by the envelope, which now takes the link name.
- Tidy-first assessor: accepted widening `delegation-envelope.test.ts` `makeDetails` as a prep step; folded the envelope signature change into the `feat!:` step (an unused parameter would trip lint).
  It flagged `ENOTDIR` handling (only `ENOENT` continues the walk) and the one exact-equality `accessIntent` assertion that breaks (`bash-external-directory.test.ts`, `cat /outside/a.ts`, because `/outside` is absent at `/`).
  Its claim that an optional field makes `toAccessFacts` a compile error is wrong; the plan says so.
- Unverified lead, not filed: a forwarded bash `external_directory` ask carries only the deciding path's `matchValues`, so the serving node resolves one path of possibly many; worth checking against [#1030]'s "every unit" fix before anyone files it.

[#620]: https://github.com/gotgenes/pi-packages/issues/620
[#684]: https://github.com/gotgenes/pi-packages/pull/684
[#799]: https://github.com/gotgenes/pi-packages/issues/799
[#983]: https://github.com/gotgenes/pi-packages/pull/983
[#1030]: https://github.com/gotgenes/pi-packages/issues/1030
