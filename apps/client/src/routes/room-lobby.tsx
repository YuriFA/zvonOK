import { useParams, Navigate } from 'react-router';

export const RoomLobbyPage = () => {
  const { slug } = useParams<{ slug: string }>();

  // Redirect /room/:slug/lobby to /room/:slug (canonical pre-join flow)
  return <Navigate to={`/room/${slug}`} replace />;
};
