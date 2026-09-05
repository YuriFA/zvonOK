/**
 * Mock factory for IScreenShareService — mirrors the pattern in lib/sfu/__mocks__/manager.ts.
 * Use in tests that consume ScreenShareService via the interface.
 */

import { vi } from "vitest";

import type { IScreenShareService, ScreenShareState, ScreenShareStateCallback } from "../types.js";

export interface MockScreenShareService extends IScreenShareService {
  /** Drive state changes in tests */
  setState(partial: Partial<ScreenShareState>): void;
  /** Simulate start succeeding */
  simulateStart(): Promise<void>;
  /** Simulate start failing with a given error */
  simulateStartError(error: string): Promise<void>;
}

export function createMockScreenShareService(
  initial?: Partial<ScreenShareState>,
): MockScreenShareService {
  let state: ScreenShareState = {
    isSharing: false,
    screenStream: null,
    isScreenShareBlocked: false,
    ...initial,
  };

  const callbacks = new Set<ScreenShareStateCallback>();

  function notify(): void {
    const snapshot = { ...state };
    for (const cb of callbacks) {
      cb(snapshot);
    }
  }

  return {
    getState: () => ({ ...state }),

    onStateChange: (cb) => {
      callbacks.add(cb);
      cb({ ...state });
      return () => callbacks.delete(cb);
    },

    start: vi.fn(),
    stop: vi.fn(),

    setState(partial) {
      state = { ...state, ...partial };
      notify();
    },

    simulateStart: async () => {
      state = { ...state, isSharing: true, screenStream: new MediaStream() };
      notify();
    },

    simulateStartError: async (error: string) => {
      throw error;
    },
  };
}
