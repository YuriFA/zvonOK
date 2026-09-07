import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateDevProject, useDevProjects } from "@/features/console/hooks/use-console";
import { getConsoleProjectRoute, ROUTES } from "@/lib/config/routes";

export const ConsoleProjectsPage = () => {
  const projects = useDevProjects();
  const createProject = useCreateDevProject();
  const [name, setName] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createProject.mutate(name.trim(), {
      onSuccess: () => setName(""),
    });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New project name"
          data-testid="project-name-input"
        />
        <Button type="submit" disabled={createProject.isPending || !name.trim()}>
          {createProject.isPending ? "Creating..." : "Create project"}
        </Button>
      </form>

      {projects.isPending ? (
        <p className="text-muted-foreground">Loading projects...</p>
      ) : projects.isError ? (
        <p className="text-destructive">Failed to load projects</p>
      ) : projects.data.length === 0 ? (
        <p className="text-muted-foreground">
          No projects yet. Create one above, then issue an API key for it.
        </p>
      ) : (
        <ul className="space-y-2">
          {projects.data.map((project) => (
            <li
              key={project.id}
              className="rounded-lg border bg-card p-4"
              data-testid={`project-${project.id}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.roomCount} room{project.roomCount === 1 ? "" : "s"} - created{" "}
                    {new Date(project.createdAt).toLocaleString()}
                    {project.webhookUrl ? " - webhook configured" : ""}
                  </p>
                </div>
                <Link
                  to={getConsoleProjectRoute(project.id)}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">
        The console manages projects and keys. The room, chat, and egress surfaces live under{" "}
        <Link to={ROUTES.HOME} className="underline underline-offset-4">
          the app
        </Link>{" "}
        and the platform REST API.
      </p>
    </>
  );
};
