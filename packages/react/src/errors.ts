/**
 * Typed errors surfaced by the @zvonok/react SDK.
 */

/**
 * Base class for all SDK errors. Carries a stable machine-readable code
 * mirroring the server's coded sfu events (sfu:join-error, sfu:host-error).
 */
export class ZvonokError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ZvonokError";
    this.code = code;
  }
}

/**
 * Join failures. Codes follow the server's SfuJoinErrorCode union plus the
 * client-side timeouts.
 */
export class ZvonokJoinError extends ZvonokError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ZvonokJoinError";
  }
}

/** Codes the server sends on sfu:join-error. */
export type ZvonokServerJoinErrorCode =
  | "ROOM_TOKEN_INVALID"
  | "ROOM_TOKEN_EXPIRED"
  | "ROOM_TOKEN_ROOM_MISMATCH"
  | "ROOM_LOCKED";

/** Client-side join failure codes. */
export type ZvonokJoinTimeoutCode = "JOIN_TIMEOUT";

/**
 * Host control action failures (mutePeer, muteAll, lockRoom). The server
 * emits sfu:host-error { code, message } on the requesting socket when a
 * host-only action is denied.
 */
export class ZvonokHostError extends ZvonokError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ZvonokHostError";
  }
}

/** Codes the server sends on sfu:host-error. */
export type ZvonokServerHostErrorCode = "NOT_ROOM_HOST";

/** Client-side host action failure codes. */
export type ZvonokHostLocalErrorCode = "DISCONNECTED" | "HOST_ACTION_FAILED";
