---
issue: 735
issue_title: "permission-forwarding: requests to dead or blocked parent sessions hang for the hardcoded 10-minute timeout"
---

# Retro: #735 — permission-forwarding: requests to dead or blocked parent sessions hang for the hardcoded 10-minute timeout

## Stage: Planning (2026-10-12T03:42:46Z)

### Session summary

Verified that three of the third-party issue's four suggestions had already shipped: configurable `forwardingTimeoutMs` (`fc6190de`), the dead-target fast-fail ([#719], [#721]), and truthful `confirmationUnavailable` reasons.
Scenario 2 traces to the [#907] root misclassification, fixed in v32.0.0.
The operator chose to settle the residual here, the unanswered-ask timeout that [#931] was parked on.
The plan adds an opt-in `promptTimeoutMs` dialog window, deny-only, with a new `{ kind: "unanswered", timeoutMs }` decider and a `prompt_unanswered` resolution.

### Observations

- Operator decisions, in order:
  - Direction B (settle the timeout here and absorb [#931]) over closing as resolved or lowering the `forwardingTimeoutMs` default.
  - Deny only, and do **not** file an allow-once follow-up; automatic allows belong to the `authorizerChain` track ([#472], [#620], PR [#983], [#698]), which the operator is still interested in.
  - A new `promptTimeoutMs` key; `forwardingTimeoutMs` stays the child's backstop.
  - The clock starts at presentation, not admission.
  - A new `unanswered` decider (P2) rather than reusing `unavailable`, whose "no interactive UI is available" sentence would be false here.
- An added design choice the operator did not gate on: the first keystroke in the inline dialog stops the clock, and the hint row names the window.
  It is isolated as TDD step 7, so it can be dropped without touching the rest.
- The `tidy-first-assessor` recommended two prep commits, both folded in as steps 1–2: collapse the dispatcher to one attribution, and rename `unansweredDecision` → `releasedDecision`.
  It also flagged that the review-log `resolution` column will read `confirmation_unavailable` for a timeout, which is recorded as a Non-Goal.
- Pi 1.0.0's `showExtensionSelector` honors `opts.signal`, and `showExtensionCustom`'s `close` is idempotent; both were verified in the pinned `dist/`.
- `Co-authored-by:` trailers for Echokovo, aoguai, and gitwyy are resolved in TDD step 6; `/ship` should close [#931] alongside #735.
- [#722] looks closable (its root-cause comment is the [#907] diagnosis) and is left as an Open Question for `/ship` or triage.

## Stage: Implementation — TDD (2026-10-12T06:41:44Z)

### Session summary

All eight planned steps landed: two Tidy-First refactors, then the `unanswered` decider, the `promptTimeoutMs` key, the `AnswerWindow` clock, the wiring `feat`, the keystroke-engagement `feat`, and docs.
There is also one docs fixup for reviewer WARNs.
The `pi-permission-system` suite went from 6027 to 6077 tests.
Every named killing mutation turned its tests red.

### Observations

- Deviations from the plan:
  - `AnswerWindow.engage()` and `pendingTimeoutMs` landed in step 7 instead of step 5, so no member shipped without a caller.
  - The surfaces take a `DialogClock` (`Pick<AnswerWindow, "signal" | "pendingTimeoutMs" | "engage">`) instead of a bare signal, so the inline component can engage the window.
  - `renderUnansweredDenial` adds the sibling renderers' serving clause for a forwarded frame ("Nobody in the session serving this request answered …").
  - The hint reads "unanswered, denies in 60s".
  - `config/config.example.json` was left alone: it lists defaults, and `promptTimeoutMs` has none, so `docs/configuration.md` shows it as a commented jsonc line instead.
- The step 3 mutation `timeoutMs > -1` killed only the zero case, not the negative one, so the plan's prediction was wrong.
  Separate mutations (`!== 0`, dropping `Number.isFinite`) killed the negative and infinite cases.
  - Dropping the `typeof` check killed nothing, because `Number.isFinite` does not coerce.
    The check stays for type narrowing.
- The step 4 schema-rejection tests and the step 6 forwarded-server relay test were green at Red (unknown keys are already rejected; the relay is variant-agnostic).
  Mutations confirmed both pin real behavior: `min(0)` / dropping `.int()` for the schema, and a `resolutionFor` mutation for the relay.
- The composition-root test's agent sentence was copied from the producer's output, not authored: `(rule '*') within 0.02s`.
- One root `pnpm run test` run failed two forwarding-liveness tests, with durations of about 6 minutes each.
  - Both passed alone, and the next full run was green.
    This is the host-load flake the package skill describes.
- Writing `\u00b7` / `\u2014` / `\u2502` as JSON escapes in `Edit` bodies failed one batch and put literal escapes into `architecture.md`.
  Both were repaired; type the literal character.
- Pre-completion reviewer: WARN, then PASS on the delta.
  - Round 1 WARNs: a stale `unansweredDecision` reference in `architecture.md`, and the configuration doc understating that the fallback window spans the scope and reason dialogs.
    Both are fixed in the docs fixup.
  - Round 1 also could not finish full lint/test within its timeouts; both ran green locally before dispatch.
  - Accepted non-blocking item: no `signal.aborted` guard on the inline abort listener.
    It is unreachable, because Pi invokes the `custom` factory synchronously and the window's timer fires at least one macrotask later.

[#472]: https://github.com/gotgenes/pi-packages/issues/472
[#620]: https://github.com/gotgenes/pi-packages/issues/620
[#698]: https://github.com/gotgenes/pi-packages/issues/698
[#719]: https://github.com/gotgenes/pi-packages/issues/719
[#721]: https://github.com/gotgenes/pi-packages/issues/721
[#722]: https://github.com/gotgenes/pi-packages/issues/722
[#907]: https://github.com/gotgenes/pi-packages/issues/907
[#931]: https://github.com/gotgenes/pi-packages/issues/931
[#983]: https://github.com/gotgenes/pi-packages/pull/983
