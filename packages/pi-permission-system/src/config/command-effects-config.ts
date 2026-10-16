import type {
  CommandEffectsConfig,
  CommandEffectsEntry,
} from "./config-schema";

/**
 * Which user config scope a `commandEffects` declaration came from.
 *
 * Agent frontmatter is not a channel (ADR 0013 §7, §9), so there is no third
 * value: a subagent declaring its own tools read-only would be self-granted
 * relief.
 */
export type DeclarationScope = "global" | "project";

/** One declared command, stamped with the scope that declared it. */
export interface DeclaredCommandEffect {
  readonly scope: DeclarationScope;
  readonly entry: CommandEffectsEntry;
}

/**
 * Every declared command after the scopes are merged, keyed by the command's
 * bare basename.
 *
 * The scope is load provenance rather than a config value: the review log's
 * blame names it, so a surprising allow is auditable to the file that granted
 * it (ADR 0013 §7, "provenance is logged").
 */
export type DeclaredCommandEffects = Readonly<
  Record<string, DeclaredCommandEffect>
>;

/** No declarations: the core and syntax are the only effect sources. */
export const NO_DECLARED_COMMAND_EFFECTS: DeclaredCommandEffects = {};

/**
 * Overlay one config layer's `commandEffects` onto the declarations so far,
 * stamping each entry with `scope`.
 *
 * Shallow by command key, on the `shellTools` precedent: a later layer's entry
 * replaces a colliding command whole, and never drops a command only an
 * earlier layer declares (a dropped declaration is a silent change in what
 * asks). An absent layer contributes nothing.
 */
export function foldDeclaredCommandEffects(
  base: DeclaredCommandEffects,
  layer: CommandEffectsConfig | undefined,
  scope: DeclarationScope,
): DeclaredCommandEffects {
  if (layer === undefined) return base;
  const stamped = Object.fromEntries(
    Object.entries(layer).map(([command, entry]) => [
      command,
      { scope, entry },
    ]),
  );
  return { ...base, ...stamped };
}

/**
 * Report the declarations the pure-reader core shadows, or `undefined` when
 * none is.
 *
 * The core answers first and its answer stands, retraction included (ADR 0013
 * §7), so a declaration keyed by a core word is never read. Saying so at load
 * keeps it from being a silent no-op. `coreWords` is injected because this
 * layer may not import the bash analysis that owns the roster.
 *
 * Pure, following `detectPermissiveBashFallback`: the caller owns pushing the
 * message onto the issue list.
 */
export function detectShadowedCommandEffects(
  declared: DeclaredCommandEffects,
  coreWords: ReadonlySet<string>,
): string | undefined {
  const shadowed = Object.keys(declared)
    .filter((command) => coreWords.has(command))
    .sort();
  if (shadowed.length === 0) return undefined;

  const names = shadowed.map((command) => `'${command}'`).join(" and ");
  return shadowed.length === 1
    ? `commandEffects declares ${names}, a pure-reader core command. The core decides its effects, so the declaration is ignored; remove it.`
    : `commandEffects declares ${names}, pure-reader core commands. The core decides their effects, so the declarations are ignored; remove them.`;
}
