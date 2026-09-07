export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  HISTORY: "/history",
  ROOM: "/room/:slug",
} as const;

export const getRoomRoute = (slug: string) => `/room/${slug}`;
