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

## Stage: Implementation — TDD (2026-10-16T02:31:31Z)

### Session summary

All six planned steps landed, plus one `fix:` and one `docs:` commit from the pre-completion review: `floorExemptionOf` answers `no-command` for a bare `env`, and `resolveWrapperUnit` resolves it by its own rule.
The `pi-permission-system` suite went from 6122 to 6187 tests (+65).
The pre-completion reviewer returned FAIL in round 1 and PASS on the delta round.

### Observations

- Round-1 FAIL: BSD `env` (macOS `/usr/bin/env`) has no long options and reads `--unset FOO` as `-`, then `-u nset`, then runs `FOO`, while `ENV_GRAMMAR` gave `--unset` GNU's separate-value arity.
  So `env --unset sh` earned the new `no-command` exemption, a bypass this change introduced; and `env --unset rm cat x` earned `core-reader` by `cat`'s rule, a fail-open already on `main` from #1053.
  The operator chose the grammar fix: a new `"attached"` `OptionArity` for `--unset` (only `--unset=FOO` admitted), which closes both directions.
  The planning spike verified bare forms on BSD with short options only; no long option was ever run on BSD, which is exactly where the two implementations part.
- The operator kept the basename rule for a path-qualified `env` (`./env`), matching the core-reader clause (the reviewer's round-1 WARN).
- Plan misprediction in Step 4: replacing `base.state === "allow"` with `true` does not redden the explicit `env: ask`/`deny` pins, because the `no-command` branch returns `base` unchanged.
  Two mechanisms protect those pins at once (only an `allow` reaches `resolveWrapperUnit`, and the branch returns the unit's own result); mutating both reddens them.
- The arm mutation for `"attached"` (a detached value falling through as one word) killed only the `executedUnitOf` row at first, since that reading is BSD's.
  `env --unset cat x` was added as the discriminating row: GNU unsets `cat` and runs `x` (verified with `genv --unset cat pwd`).
- The measurement figure moved from 34/357 to 37/363 between runs, because this session's own `env` probes were real asks in the review log; the docs cite the later run.
- Environment: the global mise `node` shim lost its version mid-session, so prek's node-based hooks failed with "No version is set for shim: node".
  Commits ran with pnpm's node (`/opt/homebrew/Cellar/node/26.12.0/bin`) prefixed on `PATH`, so every hook still ran; no `--no-verify`.
- Pre-completion reviewer: FAIL (round 1, fixed as above), then PASS (delta round, 30,164 `env` word lists executed on BSD and GNU with zero violations).
