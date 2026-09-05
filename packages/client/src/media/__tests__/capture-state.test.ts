import { describe, expect, it } from "vitest";

import {
  CaptureState,
  isActive,
  isError,
  canToggle,
  canRetry,
  getCaptureStateDisplay,
} from "../capture-state";

describe("CaptureState", () => {
  describe("isActive", () => {
    it("returns true for ACTIVE", () => {
      expect(isActive(CaptureState.ACTIVE)).toBe(true);
    });

    it("returns true for MUTED", () => {
      expect(isActive(CaptureState.MUTED)).toBe(true);
    });

    it("returns false for STOPPED", () => {
      expect(isActive(CaptureState.STOPPED)).toBe(false);
    });

    it("returns false for error states", () => {
      expect(isActive(CaptureState.DEVICE_ERROR)).toBe(false);
      expect(isActive(CaptureState.NO_DEVICE)).toBe(false);
      expect(isActive(CaptureState.SYSTEM_DENIED)).toBe(false);
    });
  });

  describe("isError", () => {
    it("returns true for error states", () => {
      expect(isError(CaptureState.DEVICE_ERROR)).toBe(true);
      expect(isError(CaptureState.NO_DEVICE)).toBe(true);
      expect(isError(CaptureState.DEVICE_IN_USE)).toBe(true);
      expect(isError(CaptureState.DEVICE_NOT_FOUND)).toBe(true);
      expect(isError(CaptureState.SYSTEM_DENIED)).toBe(true);
    });

    it("returns false for non-error states", () => {
      expect(isError(CaptureState.STOPPED)).toBe(false);
      expect(isError(CaptureState.ACTIVE)).toBe(false);
      expect(isError(CaptureState.MUTED)).toBe(false);
      expect(isError(CaptureState.STARTING)).toBe(false);
    });
  });

  describe("canToggle", () => {
    it("returns true for toggleable states", () => {
      expect(canToggle(CaptureState.STOPPED)).toBe(true);
      expect(canToggle(CaptureState.ACTIVE)).toBe(true);
      expect(canToggle(CaptureState.MUTED)).toBe(true);
      expect(canToggle(CaptureState.DEVICE_ERROR)).toBe(true);
      expect(canToggle(CaptureState.DEVICE_NOT_FOUND)).toBe(true);
      expect(canToggle(CaptureState.CAPTURE_CANCELED)).toBe(true);
    });

    it("returns false for non-toggleable states", () => {
      expect(canToggle(CaptureState.STARTING)).toBe(false);
      expect(canToggle(CaptureState.NO_DEVICE)).toBe(false);
      expect(canToggle(CaptureState.DEVICE_IN_USE)).toBe(false);
      expect(canToggle(CaptureState.SYSTEM_DENIED)).toBe(false);
    });
  });

  describe("canRetry", () => {
    it("returns true for retryable states", () => {
      expect(canRetry(CaptureState.DEVICE_NOT_FOUND)).toBe(true);
      expect(canRetry(CaptureState.DEVICE_ERROR)).toBe(true);
      expect(canRetry(CaptureState.CAPTURE_CANCELED)).toBe(true);
    });

    it("returns false for non-retryable states", () => {
      expect(canRetry(CaptureState.STOPPED)).toBe(false);
      expect(canRetry(CaptureState.ACTIVE)).toBe(false);
      expect(canRetry(CaptureState.SYSTEM_DENIED)).toBe(false);
    });
  });

  describe("getCaptureStateDisplay", () => {
    it("returns correct display for ACTIVE video", () => {
      const display = getCaptureStateDisplay(CaptureState.ACTIVE, "video");
      expect(display).toEqual({
        status: "on",
        tooltip: "Turn off camera",
        statusText: null,
      });
    });

    it("returns correct display for ACTIVE audio", () => {
      const display = getCaptureStateDisplay(CaptureState.ACTIVE, "audio");
      expect(display.tooltip).toBe("Turn off microphone");
    });

    it("returns loading for STARTING", () => {
      const display = getCaptureStateDisplay(CaptureState.STARTING, "video");
      expect(display.status).toBe("loading");
      expect(display.statusText).toBe("Starting...");
    });

    it("returns error for SYSTEM_DENIED", () => {
      const display = getCaptureStateDisplay(CaptureState.SYSTEM_DENIED, "video");
      expect(display.status).toBe("error");
      expect(display.statusText).toBe("Blocked in system settings");
    });

    it("returns error for DEVICE_NOT_FOUND", () => {
      const display = getCaptureStateDisplay(CaptureState.DEVICE_NOT_FOUND, "audio");
      expect(display.status).toBe("error");
      expect(display.statusText).toBe("Blocked");
    });

    it("returns correct display for STOPPED", () => {
      const display = getCaptureStateDisplay(CaptureState.STOPPED, "video");
      expect(display.status).toBe("off");
      expect(display.tooltip).toBe("Turn on camera");
    });

    it("returns correct display for MUTED", () => {
      const display = getCaptureStateDisplay(CaptureState.MUTED, "audio");
      expect(display.status).toBe("off");
      expect(display.tooltip).toBe("Turn on microphone");
    });
  });
});
