import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { sfuManager } from "@/lib/sfu/manager";
import type { SfuGuestJoinRequestPayload } from "@/lib/sfu/types";

import { roomApi } from "../services/room-api";

interface GuestRequestsContextValue {
  pendingRequests: SfuGuestJoinRequestPayload[];
  approveRequest: (requestId: string) => Promise<void>;
  denyRequest: (requestId: string) => Promise<void>;
}

const GuestRequestsContext = createContext<GuestRequestsContextValue | null>(null);

interface GuestRequestsProviderProps {
  roomSlug: string;
  children: React.ReactNode;
}

export function GuestRequestsProvider({ roomSlug, children }: GuestRequestsProviderProps) {
  const [pendingRequests, setPendingRequests] = useState<SfuGuestJoinRequestPayload[]>([]);

  useEffect(() => {
    return sfuManager.onGuestJoinRequest((payload) => {
      setPendingRequests((prev) => [...prev, payload]);
    });
  }, []);

  const removeRequest = useCallback((requestId: string) => {
    setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
  }, []);

  const approveRequest = useCallback(
    async (requestId: string) => {
      try {
        await roomApi.guestApprove(roomSlug, requestId);
      } catch {
        // ignore errors
      } finally {
        removeRequest(requestId);
      }
    },
    [roomSlug, removeRequest],
  );

  const denyRequest = useCallback(
    async (requestId: string) => {
      try {
        await roomApi.guestDeny(roomSlug, requestId);
      } catch {
        // ignore errors
      } finally {
        removeRequest(requestId);
      }
    },
    [roomSlug, removeRequest],
  );

  return (
    <GuestRequestsContext value={{ pendingRequests, approveRequest, denyRequest }}>
      {children}
    </GuestRequestsContext>
  );
}

const DEFAULT_VALUE: GuestRequestsContextValue = {
  pendingRequests: [],
  approveRequest: async () => {},
  denyRequest: async () => {},
};

// eslint-disable-next-line react-refresh/only-export-components
export function useGuestRequests(): GuestRequestsContextValue {
  return useContext(GuestRequestsContext) ?? DEFAULT_VALUE;
}
