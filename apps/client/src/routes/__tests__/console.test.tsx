import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DevAuthProvider } from "@/features/console/contexts/dev-auth.context";

import { ConsoleLayout } from "../console";
import { ConsoleProjectPage } from "../console-project";
import { ConsoleProjectsPage } from "../console-projects";

const mockDevApi = vi.hoisted(() => ({
  getToken: vi.fn<() => string | null>(() => "dev-jwt"),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  listProjects: vi.fn(),
  createProject: vi.fn(),
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  setWebhook: vi.fn(),
  removeWebhook: vi.fn(),
  listRooms: vi.fn(),
  listRecordings: vi.fn(),
  fetchRecordingFile: vi.fn(),
}));

vi.mock("@/features/console/services/dev-api", () => ({
  devApi: mockDevApi,
}));

vi.mock("@/components/main-header", () => ({
  MainHeader: () => <header data-testid="main-header" />,
}));

function renderConsole(
  ui: React.ReactElement,
  initialPath = "/console",
  routePattern = "/console",
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={routePattern} element={<DevAuthProvider>{ui}</DevAuthProvider>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const projects = [
  {
    id: "project-1",
    name: "My Video App",
    webhookUrl: null,
    createdAt: "2026-09-07T10:00:00.000Z",
    roomCount: 3,
  },
];

describe("ConsoleProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists projects with room counts and creates a new project", async () => {
    mockDevApi.listProjects.mockResolvedValue(projects);
    mockDevApi.createProject.mockResolvedValue({
      ...projects[0],
      id: "project-2",
      name: "Second",
      roomCount: 0,
    });

    renderConsole(<ConsoleProjectsPage />);

    await screen.findByTestId("project-project-1");
    expect(screen.getByText("My Video App")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("project-name-input"), {
      target: { value: "Second" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(mockDevApi.createProject).toHaveBeenCalledWith("Second"));
  });

  it("shows the empty state when the developer has no projects", async () => {
    mockDevApi.listProjects.mockResolvedValue([]);

    renderConsole(<ConsoleProjectsPage />);

    await waitFor(() => expect(screen.getByText(/No projects yet/i)).toBeInTheDocument());
  });
});

describe("ConsoleProjectPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a created API key once with a copy banner", async () => {
    mockDevApi.listProjects.mockResolvedValue(projects);
    mockDevApi.listApiKeys.mockResolvedValue([
      {
        id: "key-1",
        prefix: "zk_live_abc",
        createdAt: "2026-09-07T10:00:00.000Z",
        revokedAt: null,
      },
    ]);
    mockDevApi.createApiKey.mockResolvedValue({
      id: "key-2",
      key: "zk_live_full_secret_value",
      prefix: "zk_live_abc",
      createdAt: "2026-09-07T11:00:00.000Z",
    });

    renderConsole(<ConsoleProjectPage />, "/console/projects/project-1", "/console/projects/:id");

    await screen.findByTestId("key-key-1");

    fireEvent.click(screen.getByRole("button", { name: "Create key" }));

    const banner = await screen.findByTestId("key-created-banner");
    expect(banner).toHaveTextContent("zk_live_full_secret_value");
    // The full key is rendered exactly once: the list keeps metadata only.
    expect(screen.getAllByText(/zk_live_full_secret_value/)).toHaveLength(1);
    expect(mockDevApi.listApiKeys).toHaveBeenCalledWith("project-1");
  });

  it("renders rooms with their status badges", async () => {
    mockDevApi.listProjects.mockResolvedValue(projects);
    mockDevApi.listApiKeys.mockResolvedValue([]);
    mockDevApi.listRooms.mockResolvedValue([
      {
        id: "room-1",
        name: "Standup",
        slug: "standup",
        status: "ended",
        createdAt: "2026-09-07T10:00:00.000Z",
        endedAt: "2026-09-07T10:30:00.000Z",
      },
    ]);
    mockDevApi.listRecordings.mockResolvedValue([]);

    renderConsole(<ConsoleProjectPage />, "/console/projects/project-1", "/console/projects/:id");

    await screen.findByTestId("room-room-1");
    expect(screen.getByText("Standup")).toBeInTheDocument();
    expect(screen.getByText("ended")).toBeInTheDocument();
  });

  it("plays a recording from a blob fetched with the dev token", async () => {
    mockDevApi.listProjects.mockResolvedValue(projects);
    mockDevApi.listApiKeys.mockResolvedValue([]);
    mockDevApi.listRooms.mockResolvedValue([]);
    mockDevApi.listRecordings.mockResolvedValue([
      {
        id: "egress-1",
        roomId: "room-1",
        status: "ended",
        startedAt: "2026-09-07T10:00:00.000Z",
        endedAt: "2026-09-07T10:30:00.000Z",
        endedReason: "room-ended",
        recordingUrl: "/v1/recordings/egress-1/file",
        recordingSizeBytes: 1024,
        recordingFinalizedAt: "2026-09-07T10:30:05.000Z",
      },
    ]);
    mockDevApi.fetchRecordingFile.mockResolvedValue(new Blob(["video-bytes"]));

    renderConsole(<ConsoleProjectPage />, "/console/projects/project-1", "/console/projects/:id");

    fireEvent.click(await screen.findByRole("button", { name: "Play" }));

    await waitFor(() =>
      expect(mockDevApi.fetchRecordingFile).toHaveBeenCalledWith("project-1", "egress-1"),
    );
    await waitFor(() => expect(screen.getByTestId("recording-player")).toBeInTheDocument());
  });
});

describe("ConsoleLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated visitors to the console login", () => {
    mockDevApi.getToken.mockReturnValue(null);

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
          })
        }
      >
        <MemoryRouter initialEntries={["/console"]}>
          <Routes>
            <Route path="/console" element={<ConsoleLayout />}>
              <Route index element={<p>projects body</p>} />
            </Route>
            <Route path="/console/login" element={<p data-testid="console-login" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("console-login")).toBeInTheDocument();
    expect(screen.queryByText("projects body")).not.toBeInTheDocument();
  });
});
