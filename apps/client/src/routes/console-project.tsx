import { useParams } from "react-router";

import { LinkButton } from "@/components/ui/link-button";
import { ConsoleKeys } from "@/features/console/components/console-keys";
import { ConsoleRecordings, ConsoleRooms } from "@/features/console/components/console-media";
import { ConsoleWebhook } from "@/features/console/components/console-webhook";
import { useDevProjects } from "@/features/console/hooks/use-console";
import { ROUTES } from "@/lib/config/routes";

export const ConsoleProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const projects = useDevProjects();

  const project = projects.data?.find((p) => p.id === id);

  if (projects.isPending) {
    return <p className="text-muted-foreground">Loading project...</p>;
  }

  if (projects.isError || !project) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">Project not found</p>
        <LinkButton to={ROUTES.CONSOLE} variant="outline">
          Back to projects
        </LinkButton>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-xs text-muted-foreground">Project id: {project.id}</p>
        </div>
        <LinkButton to={ROUTES.CONSOLE} variant="ghost">
          All projects
        </LinkButton>
      </div>

      <ConsoleKeys projectId={project.id} />
      <ConsoleWebhook projectId={project.id} currentUrl={project.webhookUrl} />
      <ConsoleRooms projectId={project.id} />
      <ConsoleRecordings projectId={project.id} />
    </>
  );
};
