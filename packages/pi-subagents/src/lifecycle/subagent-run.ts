/**
 * subagent-run.ts — One run of a subagent and the handles it holds until it ends.
 *
 * A subagent is a sequence of runs: the initial run, then one per resume. Each
 * run is born with its own abort lever, wires the caller's signal when it
 * starts, and keeps the record observer's unsubscribe until it ends, so nothing
 * a run wires outlives it on the per-agent record.
 *
 * A run exists before it starts: the initial run is born with its agent, and
 * waits in the queue for a concurrency slot as that agent's run.
 */

/** Which run of a subagent this is: the one that created its session, or a resume of it. */
export type RunKind = "initial" | "resume";

/** One run of a subagent (the initial run or a resume) and the handles it holds until it ends. */
export class SubagentRun {
	private readonly controller = new AbortController();
	private detachCallerSignal?: () => void;
	private unsubscribeObserver?: () => void;

	constructor(
		readonly kind: RunKind,
		/** Whether this run is in the background: nothing in the parent's turn waits on it. */
		readonly inBackground: boolean,
	) {}

	/**
	 * Start the run: wire the caller's signal, when there is one, so firing it
	 * calls onCallerAbort.
	 *
	 * A signal that has already fired never fires again, so a listener on it would
	 * be dead on arrival: the run is aborted at its start instead. onCallerAbort is
	 * not called for it — the owner reads `aborted` once the run has started.
	 */
	start(callerSignal: AbortSignal | undefined, onCallerAbort: () => void): void {
		if (!callerSignal) return;
		if (callerSignal.aborted) {
			this.controller.abort();
			return;
		}
		const listener = () => onCallerAbort();
		callerSignal.addEventListener("abort", listener, { once: true });
		this.detachCallerSignal = () => callerSignal.removeEventListener("abort", listener);
	}

	/** The run's own lever, handed to the turn loop. */
	get signal(): AbortSignal {
		return this.controller.signal;
	}

	get aborted(): boolean {
		return this.controller.signal.aborted;
	}

	abort(): void {
		this.controller.abort();
	}

	/** Keep the record-observer unsubscribe until the run ends. */
	attachObserver(unsubscribe: () => void): void {
		this.unsubscribeObserver = unsubscribe;
	}

	/** Detach the caller signal and unsubscribe the observer. Idempotent. */
	release(): void {
		this.unsubscribeObserver?.();
		this.unsubscribeObserver = undefined;
		this.detachCallerSignal?.();
		this.detachCallerSignal = undefined;
	}
}
