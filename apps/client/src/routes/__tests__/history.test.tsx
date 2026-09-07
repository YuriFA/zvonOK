import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HistoryPage } from "../history";

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/contexts/auth.context", () => ({
  useAuth: mockUseAuth,
}));

const mockHistoryApi = vi.hoisted(() => ({
  listCallHistory: vi.fn(),
  getCallRecord: vi.fn(),
  deleteCallRecord: vi.fn(),
}));

vi.mock("@/features/history/services/history-api", () => ({
  historyApi: mockHistoryApi,
}));

vi.mock("@/components/main-header", () => ({
  MainHeader: () => <header data-testid="main-header" />,
}));

function renderHistory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/history"]}>
        <Routes>
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const record = {
  id: "record-1",
  roomName: "Weekly standup",
  roomSlug: "abc123",
  startedAt: "2026-09-07T10:00:00.000Z",
  endedAt: "2026-09-07T10:12:30.000Z",
  messageCount: 2,
};

const transcript = {
  ...record,
  messages: [
    {
      author: "alice",
      content: "hello team",
      createdAt: "2026-09-07T10:01:00.000Z",
    },
  ],
};

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("redirects unauthenticated visitors to login", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Login page")).toBeInTheDocument();
    });
  });

  it("renders the empty state for a user without calls", async () => {
    mockHistoryApi.listCallHistory.mockResolvedValue([]);

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText(/No calls yet/)).toBeInTheDocument();
    });
  });

  it("lists past calls newest first with name, duration, and message count", async () => {
    mockHistoryApi.listCallHistory.mockResolvedValue([record]);

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Weekly standup")).toBeInTheDocument();
    });
    expect(screen.getByText(/12m 30s/)).toBeInTheDocument();
    expect(screen.getByText(/2 messages/)).toBeInTheDocument();
  });

  it("shows the chat transcript when a record is expanded", async () => {
    mockHistoryApi.listCallHistory.mockResolvedValue([record]);
    mockHistoryApi.getCallRecord.mockResolvedValue(transcript);

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Weekly standup")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Weekly standup"));

    await waitFor(() => {
      expect(screen.getByTestId("transcript")).toBeInTheDocument();
    });
    expect(screen.getByText("hello team")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("deletes a record after confirmation", async () => {
    mockHistoryApi.listCallHistory.mockResolvedValueOnce([record]).mockResolvedValue([]);
    mockHistoryApi.deleteCallRecord.mockResolvedValue(undefined);

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("Weekly standup")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockHistoryApi.deleteCallRecord).toHaveBeenCalledWith("record-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("Weekly standup")).not.toBeInTheDocument();
    });
  });
});
