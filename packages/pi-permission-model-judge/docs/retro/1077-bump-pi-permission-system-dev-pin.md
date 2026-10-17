---
issue: 1077
issue_title: "pi-permission-model-judge: the test fixture's PromptPayload lacks matchedSpelling and decidingPath"
---

# Retro: #1077 — pi-permission-model-judge: the test fixture's PromptPayload lacks matchedSpelling and decidingPath

## Stage: Planning (2026-10-17T03:53:49Z)

### Session summary

I ran the real bump to `@gotgenes/pi-permission-system` 40.3.0 (the first version with `decidingPath`) in the worktree, then reverted it.
It breaks three things, not the one the issue predicted: the payload fixture (TS2739), `makeService()` in `test/extension.test.ts` (TS2322, three new `PermissionsService` methods), and the loading of `test/extension.test.ts` at runtime.
The plan has two steps: a `test:` commit that drops the judge's Vitest `#src`/`#test` alias, then a `build:` commit that bumps the dev pins and repairs the fixtures.

### Observations

- **The runtime break is a resolver collision, not a packaging defect.**
  The published `src/service.ts` value-re-exports through its own `#src/...` subpath imports.
  The judge's global Vitest `resolve.alias` maps every `#src` (a dependency's included) into the judge's `src/`.
  With the alias removed, Vite resolves `package.json` `imports` per package, and 69 of 69 tests pass on both 27.0.0 and 40.3.0.
  The alias dates from #157, when the mapping existed only in tsconfig `paths`.
- **Operator decisions.**
  Bump `@earendil-works/pi-ai`/`pi-coding-agent` to 1.0.0 too, which clears the unmet `>=1.0.0` peer that 40.3.0 declares (the bump #1005 deferred).
  Remove the alias in the judge only, and file the repo-wide sweep as #1078.
  Prune the `minimumReleaseAgeExclude` versions the bump orphans (`27.0.0`, `0.84.4`).
- **`pnpm add` edits the exclude list itself.**
  It rewrote the entry to `'@gotgenes/pi-permission-system@27.0.0 || 40.3.0'`, matching #788's retro.
- **#1078 notes that `pi-nocd` and `pi-session-tools` have no `imports` field.**
  Their alias is load-bearing, so the sweep is not a blind deletion.
- The tidy-first assessor recommended no tidying beyond the alias-removal step.
  It confirmed that `makeService()` has two callers and that `src/` reads only `getPermissionsService`/`registerAuthorizer`.
- No architecture doc or open phase for this package, so `roadmap-fit` exited at Step 1 for #1078.

#### Deferred tidyings

None — the assessor's rejected items (dropping tsconfig `paths`, a shared `makeService` fixture, a payload builder) were declined as unnecessary, not deferred.

## Stage: Implementation — TDD (2026-10-17T04:27:14Z)

### Session summary

I completed both TDD steps as planned: the `test:` commit that drops the judge's Vitest `#src`/`#test` alias, then the `build:` commit that bumps the dev pins to `pi-permission-system` 40.3.0 and Pi 1.0.0 and repairs the two test literals.
The test count is unchanged at 69; `src/` and `peerDependencies` are untouched, and `next-version.sh` reports nothing to release.

### Observations

- No deviations from the plan.
  Every red, green, and killing mutation produced the result the plan predicted.
  - Step 1: pointing `#src/*` at `./lib/*` failed all 7 test files.
  - Step 2: deleting `decidingPath` gave TS2741, deleting `isToolFullyDenied` gave TS2322, and restoring the alias reproduced `Cannot find module '#src/service/permission-events'` (1 file failed, 55 passed).
- `pnpm add` again added `minimumReleaseAgeExclude` entries automatically, rewriting the entry as `27.0.0 || 40.3.0`.
  The prune that followed was gated on `grep -c '0\.84\.4\|27\.0\.0' pnpm-lock.yaml` reporting 0, and `pnpm install --frozen-lockfile` passed afterward.
- Pre-completion reviewer: PASS.
  It independently enumerated every `#src`/`#test` specifier in the judge and confirmed that no workspace package depends on a pruned version.

## Stage: Sync (worktree) (2026-10-17T08:09:39Z)

### Session summary

Root `pnpm run lint` and `pnpm fallow dead-code` both passed before the rebase.
The plan's `**Release:**` marker is `ship independently`, with only `test:` and `build:` commits, so `/ship` should find nothing to release for `pi-permission-model-judge`.
The follow-up for the repo-wide `#src` alias sweep is filed as #1078.

**Peer session transcript:** `/Users/chris/.pi/agent/sessions/--Users-chris-development-pi-pi-packages-worktrees-issue-1077--/2026-10-17T03-44-40-941Z_01a147f6-37ec-76cb-b732-afe4619c93b9.jsonl` — read with `read_session_file` for message-level verification at land/retro time.

### Observations

- `/ship` should confirm `./scripts/release/next-version.sh pi-permission-model-judge` prints nothing rather than dispatch a release.
- The `build:` commit touches `pnpm-lock.yaml` and `pnpm-workspace.yaml`; a peer landing first with lockfile changes would conflict, and the rebase would stop for the operator.
