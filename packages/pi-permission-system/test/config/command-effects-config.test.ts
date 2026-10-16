import { describe, expect, it } from "vitest";
import {
  foldDeclaredCommandEffects,
  NO_DECLARED_COMMAND_EFFECTS,
} from "#src/config/command-effects-config";

describe("foldDeclaredCommandEffects", () => {
  it("stamps a layer's entries with its scope", () => {
    expect(
      foldDeclaredCommandEffects(
        NO_DECLARED_COMMAND_EFFECTS,
        { git: { subcommands: { log: "read" } } },
        "global",
      ),
    ).toEqual({
      git: { scope: "global", entry: { subcommands: { log: "read" } } },
    });
  });

  it("replaces a colliding command whole with the later layer's entry and scope", () => {
    const global = foldDeclaredCommandEffects(
      NO_DECLARED_COMMAND_EFFECTS,
      { git: { subcommands: { log: "read", diff: "read" } } },
      "global",
    );

    expect(
      foldDeclaredCommandEffects(
        global,
        { git: { subcommands: { status: "read" } } },
        "project",
      ),
    ).toEqual({
      git: { scope: "project", entry: { subcommands: { status: "read" } } },
    });
  });

  it("keeps a command only an earlier layer declares", () => {
    const global = foldDeclaredCommandEffects(
      NO_DECLARED_COMMAND_EFFECTS,
      { officecli: { effects: [] }, git: { effects: "read" } },
      "global",
    );

    expect(
      foldDeclaredCommandEffects(
        global,
        { git: { effects: "write" } },
        "project",
      ),
    ).toEqual({
      officecli: { scope: "global", entry: { effects: [] } },
      git: { scope: "project", entry: { effects: "write" } },
    });
  });

  it("returns the declarations so far when the layer declares nothing", () => {
    const global = foldDeclaredCommandEffects(
      NO_DECLARED_COMMAND_EFFECTS,
      { git: { effects: "read" } },
      "global",
    );

    expect(foldDeclaredCommandEffects(global, undefined, "project")).toBe(
      global,
    );
  });
});
