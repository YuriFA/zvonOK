import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSocket = {
  connected: false,
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

import { SfuConnection } from "../connection";

describe("SfuConnection", () => {
  let connection: SfuConnection;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    connection = new SfuConnection();
  });

  afterEach(() => {
    connection.disconnect();
  });

  it("returns a socket on connect", () => {
    const socket = connection.connect();
    expect(socket).toBe(mockSocket);
  });

  it("returns the same socket if already connected", () => {
    mockSocket.connected = true;
    const socket = connection.connect();
    expect(socket).toBe(mockSocket);
  });

  it("returns null socket before connect", () => {
    expect(connection.getSocket()).toBeNull();
  });

  it("returns the socket after connect", () => {
    connection.connect();
    expect(connection.getSocket()).toBe(mockSocket);
  });

  it("reports disconnected before connect", () => {
    expect(connection.isConnected()).toBe(false);
  });

  it("reports connected when socket is connected", () => {
    mockSocket.connected = true;
    connection.connect();
    expect(connection.isConnected()).toBe(true);
  });

  it("disconnects and clears socket", () => {
    connection.connect();
    connection.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(connection.getSocket()).toBeNull();
    expect(connection.isConnected()).toBe(false);
  });

  it("does nothing on disconnect if never connected", () => {
    connection.disconnect();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });
});
