---
issue: 1064
issue_title: "pi-permission-system: a bare `env` that runs no command should not take the indirection floor"
---

# Retro: #1064 — a bare `env` that runs no command should not take the indirection floor

## Stage: Planning (2026-10-16T00:43:21Z)

### Session summary

Reproduced the issue's table on `main` through `BashProgram.parseSync` and `resolveBashCommandCheck` in a disposable spike, verified bare-form behavior on BSD `env` and GNU `genv` 9.12, and measured 33 of 278 `<indirection-bash-wrapper>` waiting entries in the local review log deciding on a bare `env`.
The operator chose a grammar field (`bareFormRunsNothing`, `true` only on `ENV_GRAMMAR`) and a third `FloorExemption` member, `"no-command"`.
The plan is six steps: two Tidy-First preparations, a `refactor:` that names the exemption, the `fix:` gate branch in `resolveWrapperUnit`, a measurement-script step, and docs.

### Observations

- Declassifying a bare `env` in `classifyWrapperWords` was rejected before the gate, not offered: `sessionCommandIndex` would answer `0`, the session suggestion would widen to `env *`, and a session grant skips the floor, so it would cover `env rm -rf x`.
- `resolveWrapperUnit` reads `cmd.floorExemption && cmd.executedUnit`, and a bare `env` has no `executedUnit`, so an exemption from `floorExemptionOf` alone still floors; the gate needs its own branch (Step 4).
  That makes Step 3 a fail-closed `refactor:` interim.
- The Tidy-First assessor recommended extracting `getoptWalkEnd` rather than changing `getoptInnerIndex`'s `-1` contract, and hoisting the test helper `exemptionOf`; both became Steps 1–2.
  It verified that no `Record<FloorExemption, …>` or exhaustive switch exists.
- A first-draft killing mutation ("treat a refusing arity as a flag") would not have killed `env -C /tmp`, because the next word then reads as a command; corrected to "treat it as a value".
- Nested no-command forms (`sudo env`, `time env`) stay floored; the review log holds zero asks for them, so no follow-up issue was filed.
