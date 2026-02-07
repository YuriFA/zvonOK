// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import { Lobby } from "./routes/lobby.tsx";
import { LoginPage } from "./routes/login.tsx";
import { RegisterPage } from "./routes/register.tsx";
import { AuthProvider } from "./features/auth/contexts/auth.context.tsx";

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
]);

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>,
);
