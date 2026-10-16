---
issue: 880
issue_title: "pi-permission-system: commandEffects — user-declared command effects (ADR 0013 §7)"
---

# Retro: #880 — pi-permission-system: commandEffects — user-declared command effects (ADR 0013 §7)

## Stage: Planning (2026-10-16T04:18:48Z)

### Session summary

Planned the `commandEffects` config key as ten TDD steps: two Tidy-First refactors (`option-guards.ts` extraction, `BashParseOptions`), four `refactor:` steps building the scoped config fold, the declaration prover, the collector relay, and the inert-operand projection drop, two `feat:` steps wiring config to the gate and reporting core-shadowed declarations, then the measurement instrument and docs.
The operator settled the two open design questions at the gate: subcommand descent is exact-word, and the pure-reader core wins over a declaration (with a load-time warning).
Release is mid-batch ("declared-effects"); [#881] is the tail.

### Observations

- The issue's design question assumed `bash-arity.ts` could resolve `git -C ~/other log` as `git log`; reading `prefix()` showed it counts tokens and returns `["git", "-C"]`, so ADR 0013 §10's sentence describes no existing mechanism.
  Skipping dash words was rejected as fail-open (`git -C diff commit` would read as `git diff`); an option-value grammar is [#804]'s.
  Measured on the local log (crude regex, 1563 bash asks): 38 `git -C` and 2 `git -c` occurrences stay unproven under exact descent, against roughly 147 direct reader-subcommand forms.
- Following `docs/configuration.md`'s existing `commandEffects` sentence today does worse than a no-op: `unifiedConfigSchema` is strict, so the whole file is rejected and the scope floors to `ask`.
- ADR 0013 §7's `sed`/`sort` examples and the issue's `sed` example are core words since [#924], so they become shadowed declarations; the docs recipe uses `git`, `curl`, and `officecli`.
- `effects: []` is modeled as a `TokenRole` (`inert-operand`), not an effect: the role already decides candidacy.
  `projectRuleCandidates` must record the inert token's absolute spelling before dropping it, or a `bash` deny written against an absolute path would stop matching the command (a fail-open on the `bash` surface).
  Inert tokens carry `{unproven, declared-…}` so a projection that forgets the role fails closed.
- The Tidy-First assessor caught a design defect: putting the scoped map on `PermissionSystemExtensionConfig` would be dropped by `ConfigStore.save()`, which rebuilds the config via `normalizePermissionSystemConfig`.
  The map now lives as a private `ConfigStore` field behind `SessionConfigStore.declaredCommandEffects()`.
  It also corrected the relay count to 7 collectors (about 21 call sites), not 12.
- Fallow zones forbid `config/` → `access-intent/`, so the shadow detector gets `PURE_READER_CORE` injected through `ConfigStoreDeps` from `index.ts`.
- JSON-sourced record lookups need `Object.hasOwn`; a head word `constructor` would otherwise read `Object.prototype`.
- A zod 4.4.3 spike confirmed a getter-recursive entry schema validates and emits `$defs/commandEffectsEntry`; `z.infer` over the getter may still need an explicit interface (risk recorded).
- Third-party PR [#1073] (ancestor project configs) rewrites the same `loadAndMergeConfigs` project step; whichever lands second reconciles.
- boadij's comment asks for agent-specific declarations; that is [#799]'s channel question, left out of scope per ADR 0013 §7/§9.
- No follow-up issues filed: every deferral maps to an existing issue ([#799], [#804], [#881], [#882], [#952], [#926]).

#### Deferred tidyings

- `src/config/config-loader.ts`: the five legacy/global/project blocks in `loadAndMergeConfigs` repeat one load-warn-merge shape; the assessor rejected splitting them as unrelated to this change.
- `test/access-intent/bash/token-collection.test.ts` (1535 lines): restructuring was rejected as scope creep; new declaration tests go to a new file.

[#799]: https://github.com/gotgenes/pi-packages/issues/799
[#804]: https://github.com/gotgenes/pi-packages/issues/804
[#881]: https://github.com/gotgenes/pi-packages/issues/881
[#882]: https://github.com/gotgenes/pi-packages/issues/882
[#924]: https://github.com/gotgenes/pi-packages/issues/924
[#926]: https://github.com/gotgenes/pi-packages/issues/926
[#952]: https://github.com/gotgenes/pi-packages/issues/952
[#1073]: https://github.com/gotgenes/pi-packages/pull/1073
