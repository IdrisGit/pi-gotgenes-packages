---
issue: 1056
issue_title: "pi-permission-system: an unquoted computed word in a wrapper's options can split into the command the core-reader exemption never judged"
---

# Retro: #1056 — pi-permission-system: an unquoted computed word in a wrapper's options can split into the command the core-reader exemption never judged

## Stage: Planning (2026-10-13T15:47:55Z)

### Session summary

Reproduced the issue's seven rows through the real parse and gate, plus glob, brace, escape, quoted, nested, and `NAME=value` variants, then prototyped the guard and measured it against 11,206 distinct review-log bash commands (532 indirection units; 1 changes).
The operator chose to refuse every computed layer word, to place one guard among `floorExemptionOf`'s shared preconditions (retiring `isAdmittedModifierLayer`'s own checks and its assignment exemption), and `fix:` over `fix!:`.
The plan is four steps: Tidy-First pins, the `fix:` guard, the `refactor:` removal, and the docs.

### Observations

- The outermost `command_name` word reads `computed: true` (`isSpelledExactly` has no `command_name` case), so a guard scanning from index 0 floors every wrapper; the guard skips index 0, as `isAdmittedModifierLayer` already does.
  Nothing else reads the bit (the path speller skips `command_name`), so no follow-up was filed.
- The documented claim that "an environment assignment does not split" (ADR 0013's 2026-10-05 amendment, `docs/configuration.md`, `architecture.md`, from commit `1ed420e0`) is false in a wrapper's argument position: bash 5.3 prints `[nice][FOO=1][rm][y][cat][x]`.
  It described the code's skip, not a verified shell fact; Step 4 corrects all three.
- Double-quoted admission was rejected on the package's own split model (ADR 0013's 2026-09-29 amendment: a nameref to an array splits `"$U"`, and `"$@"` can vanish), verified in bash: `sudo -u "$@" cat rm` runs `rm` as user `cat`.
- The only corpus shape that flips is `env -i HOME="$HOME" PATH="$PATH" TERM=dumb true`, from `"$PATH"`.
- The prototype ran the full suite green at both the guard step and the removal step (6079 tests); after the removal, deleting the guard turns 12 existing modifier tests red, so the guard is pinned at its one site.
- The Tidy-First assessor recommended one preparatory `test:` commit pinning literal layers and session patterns; `nice -n $N mytool a` survives deleting `sessionCommandIndex`'s computed refusal on `main` and goes red only after Step 3 (measured).
- A side probe found `find . -delete -exec cat {} +` earns `core-reader`; not filed, since only a unit whose own visible text already resolved `allow` reaches the exemption, so the write is not hidden by the wrapper.

#### Deferred tidyings

- `src/access-intent/bash/node-text.ts`: `WordReader.argWord` reads a `command_name` node as computed; harmless today, but a future reader of `words[0].computed` would be misled.
