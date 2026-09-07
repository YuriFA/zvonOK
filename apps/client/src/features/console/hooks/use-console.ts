import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/api.errors";
import { consoleKeys } from "@/lib/react-query/query-keys";

import { devApi } from "../services/dev-api";

// --- Projects ---

export function useDevProjects() {
  return useQuery({
    queryKey: consoleKeys.projects(),
    queryFn: () => devApi.listProjects(),
  });
}

export function useCreateDevProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => devApi.createProject(name),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: consoleKeys.projects() });
      toast.success(`Project "${project.name}" created`);
    },
  });
}

// --- API keys ---

export function useProjectApiKeys(projectId: string) {
  return useQuery({
    queryKey: consoleKeys.keys(projectId),
    queryFn: () => devApi.listApiKeys(projectId),
  });
}

export function useCreateApiKey(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => devApi.createApiKey(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consoleKeys.keys(projectId) });
    },
  });
}

export function useRevokeApiKey(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => devApi.revokeApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consoleKeys.keys(projectId) });
      toast.success("API key revoked");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      }
    },
  });
}

// --- Webhooks ---

export function useSetWebhook(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => devApi.setWebhook(projectId, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consoleKeys.projects() });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      }
    },
  });
}

export function useRemoveWebhook(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => devApi.removeWebhook(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consoleKeys.projects() });
      toast.success("Webhook removed");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      }
    },
  });
}

// --- Rooms and recordings ---

export function useProjectRooms(projectId: string) {
  return useQuery({
    queryKey: consoleKeys.rooms(projectId),
    queryFn: () => devApi.listRooms(projectId),
  });
}

export function useProjectRecordings(projectId: string) {
  return useQuery({
    queryKey: consoleKeys.recordings(projectId),
    queryFn: () => devApi.listRecordings(projectId),
  });
}
