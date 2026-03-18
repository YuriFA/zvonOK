/**
 * ICE servers are no longer hard-coded here.
 * They are fetched from the server via the `sfu:transport-created` socket event.
 * See TASK-072 for details.
 */

export const constraints = {
  video: {
    width: {
      min: 640,
      ideal: 1920,
      max: 1920,
    },
    height: {
      min: 480,
      ideal: 1080,
      max: 1080,
    },
  },
  audio: true,
};
