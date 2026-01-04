// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import { Room } from "./routes/room.tsx";
import { Lobby } from "./routes/lobby.tsx";

import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    index: true,
    Component: Lobby,
  },
  {
    path: "/room/:room",
    Component: Room,
  },
]);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
