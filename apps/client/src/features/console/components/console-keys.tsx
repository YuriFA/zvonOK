import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useCreateApiKey, useProjectApiKeys, useRevokeApiKey } from "../hooks/use-console";
import type { DevApiKeyCreated } from "../types/console.types";

export function ConsoleKeys({ projectId }: { projectId: string }) {
  const keys = useProjectApiKeys(projectId);
  const createKey = useCreateApiKey(projectId);
  const revokeKey = useRevokeApiKey(projectId);
  const [created, setCreated] = useState<DevApiKeyCreated | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      setCreated(await createKey.mutateAsync());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create key");
    }
  };

  if (keys.isPending) {
    return <p className="text-sm text-muted-foreground">Loading keys...</p>;
  }

  if (keys.isError) {
    return <p className="text-sm text-destructive">Failed to load API keys</p>;
  }

  const allKeys = keys.data;
  const activeKeys = allKeys.filter((key) => !key.revokedAt);
  const revokedKeys = allKeys.filter((key) => key.revokedAt);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">API keys</h2>
        <Button onClick={handleCreate} disabled={createKey.isPending}>
          {createKey.isPending ? "Creating..." : "Create key"}
        </Button>
      </div>

      {created && (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
          data-testid="key-created-banner"
        >
          <p className="font-medium text-amber-600 dark:text-amber-400">
            Copy this key now, it will not be shown again:
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="block flex-1 overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-xs">
              {created.key}
            </code>
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(created.key);
                toast.success("Key copied");
              }}
            >
              Copy
            </Button>
            <Button variant="ghost" onClick={() => setCreated(null)}>
              Done
            </Button>
          </div>
        </div>
      )}

      {allKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No API keys yet. Create one to call the platform API.
        </p>
      ) : (
        <ul className="space-y-2">
          {activeKeys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between rounded-lg border bg-card p-3"
              data-testid={`key-${key.id}`}
            >
              <div className="min-w-0">
                <code className="font-mono text-sm">{key.prefix}...</code>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(key.createdAt).toLocaleString()}
                </p>
              </div>
              {confirmingId === key.id ? (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revokeKey.isPending}
                    onClick={() => {
                      revokeKey.mutate(key.id);
                      setConfirmingId(null);
                    }}
                  >
                    Confirm revoke
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmingId(key.id)}>
                  Revoke
                </Button>
              )}
            </li>
          ))}
          {revokedKeys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between rounded-lg border bg-card p-3 opacity-60"
            >
              <div>
                <code className="font-mono text-sm line-through">{key.prefix}...</code>
                <p className="text-xs text-muted-foreground">
                  Revoked {key.revokedAt ? new Date(key.revokedAt).toLocaleString() : ""}
                </p>
              </div>
              <Badge variant="outline">revoked</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
