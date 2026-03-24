import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClientProvider } from '@tanstack/react-query';

import { Home } from "./routes/home.tsx";
import { LoginPage } from "./routes/login.tsx";
import { RegisterPage } from "./routes/register.tsx";
import { AuthProvider } from "./features/auth/contexts/auth.context.tsx";
import { queryClient } from "./lib/react-query/query-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

import "./index.css";

// Lazy-loaded routes — heavy deps (mediasoup-client, socket.io-client) split into separate chunk
const LazyRoomPage = lazy(() =>
  import("./routes/room.tsx").then((m) => ({ default: m.RoomPage })),
);

const roomPageFallback = (
  <div className="flex min-h-screen items-center justify-center">
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
