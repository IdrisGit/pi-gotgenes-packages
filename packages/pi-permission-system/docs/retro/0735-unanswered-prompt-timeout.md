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

[#472]: https://github.com/gotgenes/pi-packages/issues/472
[#620]: https://github.com/gotgenes/pi-packages/issues/620
[#698]: https://github.com/gotgenes/pi-packages/issues/698
[#719]: https://github.com/gotgenes/pi-packages/issues/719
[#721]: https://github.com/gotgenes/pi-packages/issues/721
[#722]: https://github.com/gotgenes/pi-packages/issues/722
[#907]: https://github.com/gotgenes/pi-packages/issues/907
[#931]: https://github.com/gotgenes/pi-packages/issues/931
[#983]: https://github.com/gotgenes/pi-packages/pull/983
