import { describe, expect, it, vi } from "vitest";
import { SubagentRun } from "#src/lifecycle/subagent-run";

/** A run started with the given caller signal (none by default). */
function startedRun(callerSignal?: AbortSignal, onCallerAbort: () => void = vi.fn()): SubagentRun {
	const run = new SubagentRun("initial", false);
	run.start(callerSignal, onCallerAbort);
	return run;
}

describe("SubagentRun", () => {
	it("carries the kind it was born with", () => {
		expect(new SubagentRun("initial", false).kind).toBe("initial");
		expect(new SubagentRun("resume", false).kind).toBe("resume");
	});

	it("carries the mode it was born with", () => {
		expect(new SubagentRun("resume", true).inBackground).toBe(true);
		expect(new SubagentRun("resume", false).inBackground).toBe(false);
	});

	describe("its own lever", () => {
		it("starts unaborted", () => {
			const run = startedRun();
			expect(run.aborted).toBe(false);
			expect(run.signal.aborted).toBe(false);
		});

		it("abort() fires the signal handed to the turn loop", () => {
			const run = startedRun();
			run.abort();
			expect(run.aborted).toBe(true);
			expect(run.signal.aborted).toBe(true);
		});

		it("gives each run a lever of its own", () => {
			const first = startedRun();
			first.abort();
			const second = startedRun();
			expect(second.signal).not.toBe(first.signal);
			expect(second.aborted).toBe(false);
		});

		it("exists before the run starts", () => {
			const run = new SubagentRun("initial", true);
			expect(run.aborted).toBe(false);
			expect(run.signal.aborted).toBe(false);
		});
	});

	describe("the caller's signal", () => {
		it("calls onCallerAbort when the signal fires", () => {
			const controller = new AbortController();
			const onCallerAbort = vi.fn();
			startedRun(controller.signal, onCallerAbort);
			controller.abort();
			expect(onCallerAbort).toHaveBeenCalledOnce();
		});

		it("is born aborted when the signal has already fired", () => {
			const run = startedRun(AbortSignal.abort());
			expect(run.aborted).toBe(true);
			expect(run.signal.aborted).toBe(true);
		});

		it("does not call onCallerAbort for a signal that had already fired", () => {
			const onCallerAbort = vi.fn();
			const run = startedRun(AbortSignal.abort(), onCallerAbort);
			run.release();
			expect(onCallerAbort).not.toHaveBeenCalled();
		});

		it("accepts no signal", () => {
			expect(() => startedRun()).not.toThrow();
		});

		it("is wired only once the run starts", () => {
			const controller = new AbortController();
			const onCallerAbort = vi.fn();
			const run = new SubagentRun("initial", true);
			// The signal fires while the run is still queued: nothing is listening yet.
			controller.abort();
			expect(onCallerAbort).not.toHaveBeenCalled();
			expect(run.aborted).toBe(false);

			run.start(controller.signal, onCallerAbort);

			expect(run.aborted).toBe(true);
			expect(onCallerAbort).not.toHaveBeenCalled();
		});

		it("release() detaches the signal so onCallerAbort is not called after release", () => {
			const controller = new AbortController();
			const onCallerAbort = vi.fn();
			const run = startedRun(controller.signal, onCallerAbort);
			run.release();
			controller.abort();
			expect(onCallerAbort).not.toHaveBeenCalled();
		});
	});

	describe("the observer subscription", () => {
		it("calls the unsubscribe on release", () => {
			const run = startedRun();
			const unsubscribe = vi.fn();
			run.attachObserver(unsubscribe);
			run.release();
			expect(unsubscribe).toHaveBeenCalledOnce();
		});

		it("clears the handle so a second release does not double-call", () => {
			const run = startedRun();
			const unsubscribe = vi.fn();
			run.attachObserver(unsubscribe);
			run.release();
			run.release();
			expect(unsubscribe).toHaveBeenCalledOnce();
		});

		it("release is idempotent with no handles attached", () => {
			const run = startedRun();
			expect(() => {
				run.release();
				run.release();
			}).not.toThrow();
		});
	});

	describe("release", () => {
		it("clears both the signal listener and the observer unsubscribe", () => {
			const controller = new AbortController();
			const onCallerAbort = vi.fn();
			const unsubscribe = vi.fn();
			const run = startedRun(controller.signal, onCallerAbort);
			run.attachObserver(unsubscribe);
			run.release();
			controller.abort();
			expect(onCallerAbort).not.toHaveBeenCalled();
			expect(unsubscribe).toHaveBeenCalledOnce();
		});
	});
});
