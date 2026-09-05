import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDeviceControls } from "../use-device-controls.js";
import { createMockMediaManager } from "./doubles.js";

const mediaHarness = vi.hoisted(() => ({ instances: [] as unknown[] }));

vi.mock("@zvonok/client/media/manager-factory", () => ({
  createMediaManager: () => {
    const instance = createMockMediaManager();
    mediaHarness.instances.push(instance);
    return instance;
  },
}));

import { ZvonokProvider } from "../zvonok-context.js";

function Provider({ children }: { children: React.ReactNode }) {
  return <ZvonokProvider serverUrl="https://sfu.test">{children}</ZvonokProvider>;
}

function lastMediaManager() {
  return mediaHarness.instances.at(-1) as ReturnType<typeof createMockMediaManager>;
}

describe("useDeviceControls", () => {
  beforeEach(() => {
    mediaHarness.instances.length = 0;
  });

  it("shares the provider media manager and exposes capture snapshots", () => {
    const { result } = renderHook(() => useDeviceControls(), { wrapper: Provider });

    expect(result.current.camera.state).toBe(0);
    expect(result.current.camera.track).toBeNull();
  });

  it("delegates start and stop", async () => {
    const { result } = renderHook(() => useDeviceControls(), { wrapper: Provider });
    const media = lastMediaManager();

    await act(async () => {
      await result.current.start({ video: true, audio: false, videoDeviceId: "cam-9" });
    });
    expect(media.start).toHaveBeenCalledWith({ video: true, audio: false, videoDeviceId: "cam-9" });

    act(() => {
      result.current.stop();
    });
    expect(media.stop).toHaveBeenCalled();
  });

  it("delegates camera and mic toggles and device switches", async () => {
    const { result } = renderHook(() => useDeviceControls(), { wrapper: Provider });
    const media = lastMediaManager();

    await act(async () => {
      await result.current.camera.toggle(false);
    });
    expect(media.videoCapture.toggle).toHaveBeenCalledWith(false);

    await act(async () => {
      await result.current.camera.switchDevice("cam-2");
    });
    expect(media.videoCapture.switchDevice).toHaveBeenCalledWith("cam-2");

    await act(async () => {
      await result.current.mic.toggle(true);
    });
    expect(media.audioCapture.toggle).toHaveBeenCalledWith(true);

    await act(async () => {
      await result.current.mic.switchDevice("mic-3");
    });
    expect(media.audioCapture.switchDevice).toHaveBeenCalledWith("mic-3");
  });

  it("delegates device enumeration to the media device service", async () => {
    const { result } = renderHook(() => useDeviceControls(), { wrapper: Provider });
    const media = lastMediaManager();

    await act(async () => {
      await result.current.enumerateDevices();
    });

    expect(media.getDeviceService().enumerateDevices).toHaveBeenCalled();
  });

  it("reflects capture state changes from the media manager", () => {
    const { result } = renderHook(() => useDeviceControls(), { wrapper: Provider });
    const media = lastMediaManager();

    const track = { kind: "video", id: "cam-track", enabled: true } as MediaStreamTrack;
    act(() => {
      media.emitVideoState(2 as never, track);
    });

    expect(result.current.camera.state).toBe(2);
    expect(result.current.camera.track).toBe(track);

    const audioTrack = { kind: "audio", id: "mic-track", enabled: true } as MediaStreamTrack;
    act(() => {
      media.emitAudioState(2 as never, audioTrack);
    });

    expect(result.current.mic.state).toBe(2);
    expect(result.current.mic.track).toBe(audioTrack);
  });
});
