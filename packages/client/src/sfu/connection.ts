/**
 * SFU connection module.
 * Handles socket.io connection lifecycle.
 */

import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

const env = (import.meta.env ?? {}) as { VITE_SOCKET_URL?: string };

const DEFAULT_SOCKET_URL = env.VITE_SOCKET_URL ?? "http://localhost:3000";

/**
 * Manages socket.io connection to the SFU server.
 */
export class SfuConnection {
  private socket: Socket | null = null;
  private readonly socketUrl: string;

  /**
   * @param socketUrl base URL of the SFU server; defaults to
   * VITE_SOCKET_URL or http://localhost:3000.
   */
  constructor(socketUrl: string = DEFAULT_SOCKET_URL) {
    this.socketUrl = socketUrl;
  }

  /**
   * Connect to the SFU namespace.
   * Returns the socket instance.
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(`${this.socketUrl}/sfu`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    return this.socket;
  }

  /**
   * Disconnect from the SFU server.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get the current socket instance.
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if connected to the SFU server.
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
