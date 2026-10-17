import { describe, expect, it } from "vitest";
import {
	isActiveStatus,
	isRunningStatus,
	isTerminalErrorStatus,
	SubagentState,
	type SubagentStateInit,
	type SubagentStatus,
} from "#src/lifecycle/subagent-state";
import type { TurnBudget } from "#src/lifecycle/turn-limits";

const ALL_STATUSES: SubagentStatus[] = [
	"queued",
	"running",
	"completed",
	"aborted",
	"stopped",
	"error",
];

describe("SubagentState — constructor", () => {
	it("defaults numeric counters to zero", () => {
		const state = new SubagentState();
		expect(state.toolUses).toBe(0);
		expect(state.compactionCount).toBe(0);
		expect(state.lifetimeUsage).toEqual({ input: 0, output: 0, cacheWrite: 0 });
	});

	it("defaults live-activity fields", () => {
		const state = new SubagentState();
		expect(state.responseText).toBe("");
		expect(state.activeTools.size).toBe(0);
	});
});

describe("SubagentState — constructor full-value seeding", () => {
	it("seeds stats fields", () => {
		const state = new SubagentState({
			toolUses: 4,
			lifetimeUsage: { input: 100, output: 200, cacheWrite: 30 },
			compactionCount: 2,
		});
		expect(state.toolUses).toBe(4);
		expect(state.lifetimeUsage).toEqual({ input: 100, output: 200, cacheWrite: 30 });
		expect(state.compactionCount).toBe(2);
	});

	it("copies lifetimeUsage so mutating the source does not change state", () => {
		const source = { input: 10, output: 20, cacheWrite: 5 };
		const state = new SubagentState({ lifetimeUsage: source });
		source.input = 999;
		expect(state.lifetimeUsage).toEqual({ input: 10, output: 20, cacheWrite: 5 });
	});

	it("seeds live-activity fields", () => {
		const state = new SubagentState({
			activeTools: ["read", "bash"],
			responseText: "partial output",
		});
		expect([...state.activeTools.values()]).toEqual(["read", "bash"]);
		expect(state.responseText).toBe("partial output");
	});

	it("seeds activeTools by name and stays removable by name", () => {
		const state = new SubagentState({ activeTools: ["read", "read"] });
		expect(state.activeTools.size).toBe(2);
		state.removeActiveTool("read");
		expect(state.activeTools.size).toBe(1);
		expect([...state.activeTools.values()]).toEqual(["read"]);
	});
});

describe("SubagentState — incrementToolUses", () => {
	it("starts at 0 and increments by 1 each call", () => {
		const state = new SubagentState();
		expect(state.toolUses).toBe(0);
		state.incrementToolUses();
		expect(state.toolUses).toBe(1);
		state.incrementToolUses();
		expect(state.toolUses).toBe(2);
	});
});

describe("SubagentState — addUsage", () => {
	it("accumulates usage deltas into lifetimeUsage", () => {
		const state = new SubagentState();
		expect(state.lifetimeUsage).toEqual({ input: 0, output: 0, cacheWrite: 0 });
		state.addUsage({ input: 100, output: 50, cacheWrite: 10 });
		expect(state.lifetimeUsage).toEqual({ input: 100, output: 50, cacheWrite: 10 });
		state.addUsage({ input: 200, output: 80, cacheWrite: 20 });
		expect(state.lifetimeUsage).toEqual({ input: 300, output: 130, cacheWrite: 30 });
	});
});

describe("SubagentState — incrementCompactions", () => {
	it("starts at 0 and increments by 1 each call", () => {
		const state = new SubagentState();
		expect(state.compactionCount).toBe(0);
		state.incrementCompactions();
		expect(state.compactionCount).toBe(1);
		state.incrementCompactions();
		expect(state.compactionCount).toBe(2);
	});
});

describe("SubagentState — turn budget", () => {
	const WITHIN: TurnBudget = { maxTurns: 5, used: 1, phase: "within" };
	const WARNED: TurnBudget = { maxTurns: 5, used: 3, phase: "warned" };

	it("has no budget until a run's turn loop reports one", () => {
		expect(new SubagentState().turnBudget).toBeUndefined();
	});

	it("seeds the budget from init", () => {
		expect(new SubagentState({ turnBudget: WARNED }).turnBudget).toEqual(WARNED);
	});

	it("records each budget the running turn loop reports", () => {
		const state = new SubagentState();
		state.setTurnBudget(WITHIN);
		expect(state.turnBudget).toEqual(WITHIN);
		state.setTurnBudget(WARNED);
		expect(state.turnBudget).toEqual(WARNED);
	});

	it("resetForResume clears the budget, which belongs to the run that produced it", () => {
		const state = new SubagentState({ turnBudget: WARNED });
		state.resetForResume();
		expect(state.turnBudget).toBeUndefined();
	});
});

describe("SubagentState — activeTools", () => {
	it("defaults to an empty map", () => {
		const state = new SubagentState();
		expect(state.activeTools.size).toBe(0);
	});

	it("addActiveTool adds a tool by name", () => {
		const state = new SubagentState();
		state.addActiveTool("Read");
		expect(state.activeTools.size).toBe(1);
		expect([...state.activeTools.values()]).toContain("Read");
	});

	it("addActiveTool assigns unique keys for concurrent same-name tools", () => {
		const state = new SubagentState();
		state.addActiveTool("Read");
		state.addActiveTool("Read");
		expect(state.activeTools.size).toBe(2);
		expect([...state.activeTools.values()]).toEqual(["Read", "Read"]);
		const keys = [...state.activeTools.keys()];
		expect(keys[0]).not.toBe(keys[1]);
	});

	it("removeActiveTool removes the first matching tool by name", () => {
		const state = new SubagentState();
		state.addActiveTool("Read");
		state.addActiveTool("Write");
		state.removeActiveTool("Read");
		expect(state.activeTools.size).toBe(1);
		expect([...state.activeTools.values()]).toContain("Write");
		expect([...state.activeTools.values()]).not.toContain("Read");
	});

	it("removeActiveTool removes only one entry when two same-name tools are active", () => {
		const state = new SubagentState();
		state.addActiveTool("Read");
		state.addActiveTool("Read");
		state.removeActiveTool("Read");
		expect(state.activeTools.size).toBe(1);
		expect([...state.activeTools.values()]).toEqual(["Read"]);
	});

	it("removeActiveTool is a no-op when the tool is not active", () => {
		const state = new SubagentState();
		state.addActiveTool("Read");
		state.removeActiveTool("Write"); // not present
		expect(state.activeTools.size).toBe(1);
	});

	it("activeTools getter returns a ReadonlyMap", () => {
		const state = new SubagentState();
		state.addActiveTool("Read");
		const tools = state.activeTools;
		// Verify it's a Map (ReadonlyMap is Map at runtime)
		expect(tools).toBeInstanceOf(Map);
		expect(tools.size).toBe(1);
	});
});

describe("SubagentState — responseText", () => {
	it("defaults to an empty string", () => {
		const state = new SubagentState();
		expect(state.responseText).toBe("");
	});

	it("appendResponseText concatenates text deltas", () => {
		const state = new SubagentState();
		state.appendResponseText("Hello ");
		state.appendResponseText("world");
		expect(state.responseText).toBe("Hello world");
	});

	it("resetResponseText clears accumulated text", () => {
		const state = new SubagentState();
		state.appendResponseText("previous text");
		state.resetResponseText();
		expect(state.responseText).toBe("");
	});

	it("appendResponseText works after a reset", () => {
		const state = new SubagentState();
		state.appendResponseText("first message");
		state.resetResponseText();
		state.appendResponseText("second message");
		expect(state.responseText).toBe("second message");
	});
});

describe("SubagentState — classification predicates", () => {
	const active = new Set<SubagentStatus>(["running", "queued"]);
	const terminalError = new Set<SubagentStatus>(["error", "stopped", "aborted"]);
	const running = new Set<SubagentStatus>(["running"]);

	describe("exported status-level functions", () => {
		for (const status of ALL_STATUSES) {
			it(`isActiveStatus("${status}") is ${active.has(status)}`, () => {
				expect(isActiveStatus(status)).toBe(active.has(status));
			});
			it(`isTerminalErrorStatus("${status}") is ${terminalError.has(status)}`, () => {
				expect(isTerminalErrorStatus(status)).toBe(terminalError.has(status));
			});
			it(`isRunningStatus("${status}") is ${running.has(status)}`, () => {
				expect(isRunningStatus(status)).toBe(running.has(status));
			});
		}
	});
});

describe("SubagentState — run updates", () => {
	it("starts with none", () => {
		expect(new SubagentState().runUpdates).toEqual([]);
	});

	it("keeps the order the child sent them in", () => {
		const state = new SubagentState();

		state.recordUpdate("The bug is in the retry wrapper.");
		state.recordUpdate("The fixture is stale too.");

		expect(state.runUpdates).toEqual([
			"The bug is in the retry wrapper.",
			"The fixture is stale too.",
		]);
	});

	it("drops the previous run's updates when a resume starts", () => {
		const state = new SubagentState();
		state.recordUpdate("From the run being resumed.");

		state.resetForResume();

		expect(state.runUpdates).toEqual([]);
	});

	it("cannot be seeded from a rehydrated record", () => {
		// Transient runtime state, like the carrier claim: a rehydrated record has
		// no run to have produced it.
		const state = new SubagentState({ runUpdates: ["seeded"] } as unknown as SubagentStateInit);

		expect(state.runUpdates).toEqual([]);
	});

	describe("the announcement latch", () => {
		it("omits a message the announcement channel delivered", () => {
			const state = new SubagentState();
			state.recordUpdate("Announced already.");
			state.recordUpdate("Still owed to a carrier.");

			state.markUpdateAnnounced("Announced already.");

			expect(state.runUpdates).toEqual(["Still owed to a carrier."]);
		});

		it("marks the first unannounced copy, leaving a later duplicate owed", () => {
			const state = new SubagentState();
			state.recordUpdate("Same finding twice.");
			state.recordUpdate("Same finding twice.");

			state.markUpdateAnnounced("Same finding twice.");

			expect(state.runUpdates).toEqual(["Same finding twice."]);
		});

		it("ignores a message this run never produced", () => {
			const state = new SubagentState();
			state.recordUpdate("From this run.");

			state.markUpdateAnnounced("From a run that was reset.");

			expect(state.runUpdates).toEqual(["From this run."]);
		});
	});
});

describe("SubagentState — lastProgressAt", () => {
	it("defaults to when the state was created", () => {
		const before = Date.now();
		const state = new SubagentState();
		const after = Date.now();

		expect(state.lastProgressAt).toBeGreaterThanOrEqual(before);
		expect(state.lastProgressAt).toBeLessThanOrEqual(after);
	});

	it("is seeded from an explicit value", () => {
		const state = new SubagentState({ lastProgressAt: 4000 });

		expect(state.lastProgressAt).toBe(4000);
	});

	it("is stamped by markProgress", () => {
		const state = new SubagentState({ lastProgressAt: 1000 });

		state.markProgress(2500);

		expect(state.lastProgressAt).toBe(2500);
	});
});
