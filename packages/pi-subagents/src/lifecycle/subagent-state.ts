/**
 * subagent-state.ts — SubagentState value object: metrics and live activity, and the status vocabulary.
 *
 * Owns the passive, readable state of a subagent that spans its runs — stats
 * (toolUses, lifetimeUsage, compactionCount), live-activity fields
 * (activeTools, responseText, lastProgressAt), and, until each run owns them,
 * the turn budget, the pending question, the workspace notice, and the update
 * ledger — together with the accumulation methods (incrementToolUses, addUsage,
 * incrementCompactions) and live-activity transition methods (setTurnBudget,
 * addActiveTool, removeActiveTool, resetResponseText, appendResponseText,
 * markProgress) that mutate them. A run's status, result, and timestamps live
 * on its SubagentRun.
 *
 * State is encapsulated behind getters; external code reads through them but
 * mutates only via the transition/accumulation methods. The value object owns
 * all of its own mutations — no field is written from outside.
 *
 * Subagent holds one of these privately and delegates its getters and mutation
 * methods to it. Extracting it lets the lifecycle state machine and the
 * session-event observer be unit-tested without constructing an executor.
 */

import type { TurnBudget } from "#src/lifecycle/turn-limits";
import type { LifetimeUsage } from "#src/lifecycle/usage";
import { addUsage } from "#src/lifecycle/usage";

export type SubagentStatus =
	| "queued"
	| "running"
	| "completed"
	| "aborted"
	| "stopped"
	| "error";

/** What a settled run ended with: the fields an outcome carrier renders. */
export interface SettledOutcome {
	status: SubagentStatus;
	result: string | undefined;
	error: string | undefined;
	startedAt: number;
	completedAt: number | undefined;
	pendingQuestion: string | undefined;
	workspaceNotice: string | undefined;
	/** The updates no announcement delivered; what the carrier still owes. */
	runUpdates: readonly string[];
	/** The run's turn limit and its use; absent when no limit applied. */
	turnBudget?: TurnBudget;
}

// ---- Status classification predicates ----
// The single decision point for the re-derived status groupings. Instance
// methods on SubagentRun delegate here; DTO consumers holding a bare
// SubagentStatus (no SubagentState instance) call these directly.

/** Running or queued — the agent is still live (started or awaiting a slot). */
export function isActiveStatus(status: SubagentStatus): boolean {
	return status === "running" || status === "queued";
}

/** Terminated by error, harness turn-limit abort, or external stop. */
export function isTerminalErrorStatus(status: SubagentStatus): boolean {
	return status === "error" || status === "stopped" || status === "aborted";
}

/** Actively running (excludes queued). */
export function isRunningStatus(status: SubagentStatus): boolean {
	return status === "running";
}

/** One update a child sent during a run, and whether an announcement delivered it. */
interface RunUpdate {
	message: string;
	announced: boolean;
}

export interface SubagentStateInit {
	/** The question the agent ended its turn with — an outcome fact, like result. */
	pendingQuestion?: string;
	/** What a teardown with no result text reported — an outcome fact, like result. */
	workspaceNotice?: string;
	/** The run's turn limit and its use — an outcome fact, like result. */
	turnBudget?: TurnBudget;
	/** When the run last made progress; defaults to when the state was created. */
	lastProgressAt?: number;
	// Stats — seed a populated value without replaying the accumulation methods
	toolUses?: number;
	lifetimeUsage?: LifetimeUsage;
	compactionCount?: number;
	// Live activity — activeTools is seeded by name (each entry calls addActiveTool)
	activeTools?: string[];
	responseText?: string;
}

export class SubagentState {
	// The question this agent ended its turn with, if it declared one. Part of the
	// outcome like _result, and set alongside it at the terminal transition.
	private _pendingQuestion?: string;
	get pendingQuestion(): string | undefined { return this._pendingQuestion; }

	// What the workspace reported at a teardown with no result text to fold it
	// into. Part of the outcome like _result, and set at the disposal that
	// produced it. Undefined for a run whose addendum rode the result instead.
	private _workspaceNotice?: string;
	get workspaceNotice(): string | undefined { return this._workspaceNotice; }

	// The run's turn budget, live: the turn loop reports it before the first turn
	// and after each boundary, so the last report is already the outcome's. Part
	// of the outcome like _result, and cleared where a run begins (resetForResume).
	private _turnBudget?: TurnBudget;
	get turnBudget(): TurnBudget | undefined { return this._turnBudget; }

	// The updates the child sent during this run, each remembering whether the
	// announcement channel delivered it — so a message reaches the parent once,
	// through whichever channel could reach it, and no carrier repeats it.
	// Scoped to the run, so it clears wherever a run begins.
	// Transient runtime state, so deliberately not seedable via SubagentStateInit
	// — a rehydrated record has no run to have produced these.
	private _runUpdates: RunUpdate[] = [];
	/** The updates no announcement delivered — what an outcome carrier must render. */
	get runUpdates(): readonly string[] {
		return this._runUpdates.filter((update) => !update.announced).map((update) => update.message);
	}

	// Stats — accumulated via mutation methods, readable via getters
	private _toolUses: number;
	get toolUses(): number { return this._toolUses; }

	private _lifetimeUsage: LifetimeUsage;
	get lifetimeUsage(): Readonly<LifetimeUsage> { return this._lifetimeUsage; }

	private _compactionCount: number;
	get compactionCount(): number { return this._compactionCount; }

	// Live activity — accumulated via transition methods, readable via getters
	private _activeTools = new Map<string, string>();
	get activeTools(): ReadonlyMap<string, string> { return this._activeTools; }

	private _toolKeySeq = 0;

	private _responseText: string;
	get responseText(): string { return this._responseText; }

	/** When the current run last emitted a session event; its start until it emits one. */
	private _lastProgressAt: number;
	get lastProgressAt(): number { return this._lastProgressAt; }

	constructor(init: SubagentStateInit = {}) {
		this._pendingQuestion = init.pendingQuestion;
		this._workspaceNotice = init.workspaceNotice;
		this._turnBudget = init.turnBudget;
		this._lastProgressAt = init.lastProgressAt ?? Date.now();
		this._toolUses = init.toolUses ?? 0;
		// Copy so a later addUsage() cannot mutate the caller's object.
		this._lifetimeUsage = init.lifetimeUsage
			? { ...init.lifetimeUsage }
			: { input: 0, output: 0, cacheWrite: 0 };
		this._compactionCount = init.compactionCount ?? 0;
		this._responseText = init.responseText ?? "";
		for (const name of init.activeTools ?? []) {
			this.addActiveTool(name);
		}
	}

	/** Increment tool use count. Called by record-observer on tool_execution_end. */
	incrementToolUses(): void {
		this._toolUses++;
	}

	/** Accumulate a usage delta into lifetimeUsage. Called by record-observer on message_end. */
	addUsage(delta: { input: number; output: number; cacheWrite: number }): void {
		addUsage(this._lifetimeUsage, delta);
	}

	/** Increment compaction count. Called by record-observer on compaction_end. */
	incrementCompactions(): void {
		this._compactionCount++;
	}

	/** Record a tool starting. Called by record-observer on tool_execution_start. */
	addActiveTool(toolName: string): void {
		this._activeTools.set(toolName + "_" + (++this._toolKeySeq), toolName);
	}

	/** Remove one active tool by name (first match). Called by record-observer on tool_execution_end. */
	removeActiveTool(toolName: string): void {
		for (const [key, name] of this._activeTools) {
			if (name === toolName) {
				this._activeTools.delete(key);
				break;
			}
		}
	}

	/** Reset the current response text. Called by record-observer on message_start. */
	resetResponseText(): void {
		this._responseText = "";
	}

	/** Append a text delta to the current response text. Called by record-observer on message_update. */
	appendResponseText(delta: string): void {
		this._responseText += delta;
	}

	/** Record that the run made progress. Called by record-observer on every session event. */
	markProgress(at: number = Date.now()): void {
		this._lastProgressAt = at;
	}

	/** Record the budget the running turn loop reports. */
	setTurnBudget(budget: TurnBudget): void {
		this._turnBudget = budget;
	}

	/** Record an update the child sent during this run, owed to a carrier until delivered. */
	recordUpdate(message: string): void {
		this._runUpdates.push({ message, announced: false });
	}

	/**
	 * The announcement channel delivered this message, so no outcome carrier may
	 * repeat it. Marks the first copy still owed: two identical messages are two
	 * facts the child sent twice, and one announcement delivered one of them.
	 */
	markUpdateAnnounced(message: string): void {
		const owed = this._runUpdates.find((update) => !update.announced && update.message === message);
		if (owed) owed.announced = true;
	}

	/** Record the question the agent ended its turn with. */
	setPendingQuestion(question: string | undefined): void {
		this._pendingQuestion = question;
	}

	/** Record what a teardown reported when no result text could carry it. */
	setWorkspaceNotice(notice: string): void {
		this._workspaceNotice = notice;
	}

	/**
	 * Reset for resume: clear the turn budget, the question, and the update
	 * ledger. The rest of the outcome is the run's own, so the resume's new run
	 * starts without it.
	 */
	resetForResume(): void {
		this._turnBudget = undefined;
		// A resumed run answers the old question; whether it asks a new one is
		// decided when it terminates.
		this._pendingQuestion = undefined;
		// The updates belong to the run that produced them, and this starts another.
		this._runUpdates.length = 0;
	}
}
