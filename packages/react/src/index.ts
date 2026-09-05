/**
 * @zvonok/react public entry point: headless React bindings over
 * {@link https://www.npmjs.com/package/@zvonok/client | @zvonok/client}.
 */

export { ZvonokProvider, type ZvonokProviderProps } from "./zvonok-context.js";
export {
  useZvonokConnection,
  type UseZvonokConnectionOptions,
  type UseZvonokConnectionResult,
} from "./use-zvonok-connection.js";
export { useParticipants, type UseParticipantsResult } from "./use-participants.js";
export { useHostControls, type UseHostControlsResult } from "./use-host-controls.js";
export { useDeviceControls, type UseDeviceControlsResult } from "./use-device-controls.js";
export {
  ZvonokError,
  ZvonokHostError,
  ZvonokJoinError,
  type ZvonokHostLocalErrorCode,
  type ZvonokServerHostErrorCode,
  type ZvonokServerJoinErrorCode,
} from "./errors.js";
export type { ZvonokParticipant, ZvonokStatus } from "./types.js";
