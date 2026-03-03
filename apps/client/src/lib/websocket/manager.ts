import { io } from 'socket.io-client';
import type {
  ConnectionStatus,
  ConnectionStatusCallback,
  ServerToClientEvents,
  ClientToServerEvents,
  TypedSocket,
} from './types';

const SOCKET_URL = (import.meta.env as { VITE_SOCKET_URL?: string }).VITE_SOCKET_URL ?? 'http://localhost:3000';

export class WebSocketManager {
  private socket: TypedSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private currentRoom: string | null = null;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.setStatus('connecting');

    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    }) as TypedSocket;

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoom = null;
      this.setStatus('disconnected');
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.setStatus('connected');
    });

    this.socket.on('disconnect', () => {
      this.setStatus('disconnected');
      this.currentRoom = null;
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.setStatus('reconnecting');
    });

    this.socket.io.on('reconnect', () => {
      this.setStatus('connected');
    });

    this.socket.io.on('reconnect_failed', () => {
      this.setStatus('disconnected');
    });
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusCallbacks.forEach((callback) => callback(status));
  }

  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.status);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  joinRoom(roomCode: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('join:room', { roomCode });
    this.currentRoom = roomCode;
  }

  leaveRoom(): void {
    if (!this.socket) return;
    this.socket.emit('leave:room');
    this.currentRoom = null;
  }

  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit(event, ...args);
  }

  on<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K],
  ): void {
    if (!this.socket) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.on(event, handler as any);
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K],
  ): void {
    if (!this.socket) return;
    if (handler) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.off(event, handler as any);
    } else {
      this.socket.off(event);
    }
  }

  once<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K],
  ): void {
    if (!this.socket) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.once(event, handler as any);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocket(): TypedSocket | null {
    return this.socket;
  }
}

export const wsManager = new WebSocketManager();
