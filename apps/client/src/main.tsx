import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClientProvider } from '@tanstack/react-query';

import { Lobby } from "./routes/lobby.tsx";
import { LoginPage } from "./routes/login.tsx";
import { RegisterPage } from "./routes/register.tsx";
import { RoomPage } from "./routes/room.tsx";
import { AuthProvider } from "./features/auth/contexts/auth.context.tsx";
import { queryClient } from "./lib/react-query/query-client";

import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    index: true,
    Component: Lobby,
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
    Component: RoomPage,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
