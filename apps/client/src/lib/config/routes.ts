export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ROOM: '/room/:slug',
} as const;

export const getRoomRoute = (slug: string) => `/room/${slug}`;
