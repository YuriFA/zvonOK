import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useRemoveWebhook, useSetWebhook } from "../hooks/use-console";

export function ConsoleWebhook({
  projectId,
  currentUrl,
}: {
  projectId: string;
  currentUrl: string | null;
}) {
  const setWebhook = useSetWebhook(projectId);
  const removeWebhook = useRemoveWebhook(projectId);
  const [url, setUrl] = useState(currentUrl ?? "");
  const [configured, setConfigured] = useState<{ url: string; secret: string } | null>(null);

  const handleSet = async () => {
    try {
      const result = await setWebhook.mutateAsync(url);
      setConfigured(result);
      toast.success("Webhook configured");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set webhook");
    }
  };

  const handleRemove = async () => {
    try {
      await removeWebhook.mutateAsync();
      setUrl("");
      toast.success("Webhook removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove webhook");
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Webhook endpoint</h2>
      <p className="text-sm text-muted-foreground">
        Platform events (room ended, recording finalized, ...) are delivered to this URL and signed
        with a secret.
      </p>

      {configured && (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
          data-testid="webhook-secret-banner"
        >
          <p className="font-medium text-amber-600 dark:text-amber-400">
            Signing secret, shown once:
          </p>
          <code className="mt-1 block overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-xs">
            {configured.secret}
          </code>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/hooks/zvonok"
          data-testid="webhook-url-input"
        />
        <Button onClick={handleSet} disabled={setWebhook.isPending || !url}>
          {setWebhook.isPending ? "Saving..." : "Save"}
        </Button>
        {currentUrl && (
          <Button variant="ghost" onClick={handleRemove} disabled={removeWebhook.isPending}>
            Remove
          </Button>
        )}
      </div>
      {currentUrl && !configured && (
        <p className="text-xs text-muted-foreground">
          Current endpoint: <code className="font-mono">{currentUrl}</code>
        </p>
      )}
    </div>
  );
}
