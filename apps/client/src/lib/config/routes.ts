export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  HISTORY: "/history",
  ROOM: "/room/:slug",
  CONSOLE: "/console",
  CONSOLE_LOGIN: "/console/login",
} as const;

export const getRoomRoute = (slug: string) => `/room/${slug}`;

export const getConsoleProjectRoute = (id: string) => `/console/projects/${id}`;
