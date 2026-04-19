import { useEffect, useState } from "react";

import { sfuManager } from "@/lib/sfu/manager";
import type { SfuGuestJoinRequestPayload } from "@/lib/sfu/types";

import { Button } from "@/components/ui/button";

import { roomApi } from "../services/room-api";

interface GuestApprovalDialogProps {
  roomSlug: string;
}

export function GuestApprovalDialog({ roomSlug }: GuestApprovalDialogProps) {
  const [requests, setRequests] = useState<SfuGuestJoinRequestPayload[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    return sfuManager.onGuestJoinRequest((payload) => {
      setRequests((prev) => [...prev, payload]);
    });
  }, []);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await roomApi.guestApprove(roomSlug, requestId);
    } catch {
      // ignore errors
    } finally {
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      setProcessing(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await roomApi.guestDeny(roomSlug, requestId);
    } catch {
      // ignore errors
    } finally {
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      setProcessing(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {requests.map((req) => (
        <div key={req.requestId} className="rounded-lg border border-border bg-card p-4 shadow-lg">
          <p className="mb-3 text-sm font-medium">
            <strong>{req.displayName}</strong> wants to join the room
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleApprove(req.requestId)}
              disabled={processing === req.requestId}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeny(req.requestId)}
              disabled={processing === req.requestId}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
