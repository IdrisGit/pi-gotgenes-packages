import { describe, expect, it, vi } from "vitest";
import { SubagentRun } from "#src/lifecycle/subagent-run";

describe("SubagentRun", () => {
	describe("its own lever", () => {
		it("starts unaborted", () => {
			const run = new SubagentRun(undefined, vi.fn());
			expect(run.aborted).toBe(false);
			expect(run.signal.aborted).toBe(false);
		});

		it("abort() fires the signal handed to the turn loop", () => {
			const run = new SubagentRun(undefined, vi.fn());
			run.abort();
			expect(run.aborted).toBe(true);
			expect(run.signal.aborted).toBe(true);
		});

		it("gives each run a lever of its own", () => {
			const first = new SubagentRun(undefined, vi.fn());
			first.abort();
			const second = new SubagentRun(undefined, vi.fn());
			expect(second.signal).not.toBe(first.signal);
			expect(second.aborted).toBe(false);
		});
	});

	describe("the caller's signal", () => {
		it("calls onCallerAbort when the signal fires", () => {
			const controller = new AbortController();
			const onCallerAbort = vi.fn();
			new SubagentRun(controller.signal, onCallerAbort);
			controller.abort();
			expect(onCallerAbort).toHaveBeenCalledOnce();
		});

		it("accepts no signal", () => {
			expect(() => new SubagentRun(undefined, vi.fn())).not.toThrow();
		});

		it("release() detaches the signal so onCallerAbort is not called after release", () => {
			const controller = new AbortController();
			const onCallerAbort = vi.fn();
			const run = new SubagentRun(controller.signal, onCallerAbort);
			run.release();
			controller.abort();
			expect(onCallerAbort).not.toHaveBeenCalled();
		});
	});

	describe("the observer subscription", () => {
		it("calls the unsubscribe on release", () => {
			const run = new SubagentRun(undefined, vi.fn());
			const unsubscribe = vi.fn();
			run.attachObserver(unsubscribe);
			run.release();
			expect(unsubscribe).toHaveBeenCalledOnce();
		});

		it("clears the handle so a second release does not double-call", () => {
			const run = new SubagentRun(undefined, vi.fn());
			const unsubscribe = vi.fn();
			run.attachObserver(unsubscribe);
			run.release();
			run.release();
			expect(unsubscribe).toHaveBeenCalledOnce();
		});

		it("release is idempotent with no handles attached", () => {
			const run = new SubagentRun(undefined, vi.fn());
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
			const run = new SubagentRun(controller.signal, onCallerAbort);
			run.attachObserver(unsubscribe);
			run.release();
			controller.abort();
			expect(onCallerAbort).not.toHaveBeenCalled();
			expect(unsubscribe).toHaveBeenCalledOnce();
		});
	});
});
