import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "./features/auth/contexts/auth.context.tsx";
import { queryClient } from "./lib/react-query/query-client";
import { Home } from "./routes/home.tsx";
import { LoginPage } from "./routes/login.tsx";
import { RegisterPage } from "./routes/register.tsx";

import "./index.css";

const API_BASE_URL =
  (import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL ?? "http://localhost:3000";

console.log(`%c[zvonok] client v${__CLIENT_VERSION__}`, "color: #6366f1; font-weight: bold");

fetch(`${API_BASE_URL}/version`)
  .then((res) => res.json())
  .then((data: { version?: string; name?: string }) => {
    console.log(
      `%c[zvonok] server v${data.version} (${data.name})`,
      "color: #10b981; font-weight: bold",
    );
  })
  .catch(() => {});

// Lazy-loaded routes — heavy deps (mediasoup-client, socket.io-client) split into separate chunk
const LazyRoomPage = lazy(() => import("./routes/room.tsx").then((m) => ({ default: m.RoomPage })));

const roomPageFallback = (
  <div className="flex h-dscreen items-center justify-center">
    <p className="text-muted-foreground">Loading room...</p>
  </div>
);

const router = createBrowserRouter([
  {
    path: "/",
    index: true,
    Component: Home,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  {
    path: "/room/:slug",
    element: (
      <Suspense fallback={roomPageFallback}>
        <LazyRoomPage />
      </Suspense>
    ),
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
