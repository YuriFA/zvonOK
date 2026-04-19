import { useState } from "react";

import { Button } from "@/components/ui/button";

import { useGuestRequests } from "../contexts/guest-requests.context";

export function GuestApprovalDialog() {
  const { pendingRequests, approveRequest, denyRequest } = useGuestRequests();
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await approveRequest(requestId);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await denyRequest(requestId);
    } finally {
      setProcessing(null);
    }
  };

  if (pendingRequests.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {pendingRequests.map((req) => (
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
