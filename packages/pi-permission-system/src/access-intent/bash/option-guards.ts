import type { ArgWord } from "./node-text";

// ── Public surface ─────────────────────────────────────────────────────────

/**
 * Whether a guarded word's arguments withdraw its read claim.
 *
 * Each guarded word owns its own predicate, so a word whose proof needs more
 * than option spellings can supply one without widening the option shape.
 */
export type ClaimWithdrawal = (argWords: readonly ArgWord[]) => boolean;

/**
 * A withdrawal decided by option spellings: any argument naming one.
 *
 * A computed argument's value is its unresolved source spelling, not what the
 * program receives, so it is asked only whether it may arrive beginning with
 * `-`, the shape every guarded option has.
 */
export function optionGuard(guard: RetractionGuard): ClaimWithdrawal {
  return (argWords) =>
    argWords.some((word) =>
      word.computed ? word.mayLeadWithDash : retractsClaim(word.value, guard),
    );
}

/**
 * The option forms that withdraw a guarded word's read claim.
 *
 * Matching is fail-closed over the forms ADR 0013 §7 names: a long stem
 * matches bare, with an attached `=value`, or as any prefix of itself, and a
 * short letter matches anywhere in a single-dash cluster, which covers the
 * attached-value form (`-oFILE`) too. Over-retraction costs one ask;
 * under-retraction misses a write.
 *
 * The prefix rule exists because GNU `getopt_long` accepts any unambiguous
 * abbreviation, so `sort --out=/tmp/x` reaches the same code `--output` does.
 * Matching every prefix also retracts on an abbreviation the real program
 * would reject as ambiguous — the affordable direction.
 */
export interface RetractionGuard {
  /** Whole argument words, for options that neither cluster nor take `=`. */
  readonly exactWords?: ReadonlySet<string>;
  /** Long stems, matched bare (`--output`) or attached (`--output=/tmp/x`). */
  readonly longStems?: ReadonlySet<string>;
  /** Short letters, matched anywhere in a single-dash cluster (`-uo`). */
  readonly shortLetters?: ReadonlySet<string>;
}

// ── Private helpers ────────────────────────────────────────────────────────

function retractsClaim(word: string, guard: RetractionGuard): boolean {
  if (guard.exactWords?.has(word)) return true;
  if (matchesLongStem(word, guard.longStems)) return true;
  return matchesShortCluster(word, guard.shortLetters);
}

/**
 * A long option, bare, carrying its value inline, or abbreviated.
 *
 * The name is taken before the first `=`, so `--out=/tmp/x` is tested as
 * `--out` — an abbreviation of `--output` that GNU `getopt_long` resolves to
 * it. A bare `--` abbreviates nothing.
 */
function matchesLongStem(
  word: string,
  stems: ReadonlySet<string> | undefined,
): boolean {
  if (!stems) return false;
  const name = word.split("=")[0];
  if (!name.startsWith("--") || name.length <= 2) return false;
  for (const stem of stems) {
    if (stem.startsWith(name)) return true;
  }
  return false;
}

/**
 * A guarded letter anywhere in a single-dash cluster.
 *
 * The scan runs past the letters into an attached value, which is what makes
 * `-oFILE` retract as surely as `-o FILE` does.
 */
function matchesShortCluster(
  word: string,
  letters: ReadonlySet<string> | undefined,
): boolean {
  if (!letters) return false;
  if (!word.startsWith("-") || word.startsWith("--") || word.length < 2) {
    return false;
  }
  const cluster = word.slice(1);
  for (const letter of letters) {
    if (cluster.includes(letter)) return true;
  }
  return false;
}
