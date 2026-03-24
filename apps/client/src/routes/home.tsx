import { useState } from "react";
import { LinkButton } from '@/components/ui/link-button';
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { useCreateRoom } from "@/features/room/hooks/use-create-room";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES, getRoomRoute } from "@/lib/config/routes";
import HeroBg from '@/../public/hero-bg.svg?react';

export const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [roomCode, setRoomCode] = useState("");

  const createRoom = useCreateRoom({
    onSuccess: (room) => {
      navigate(getRoomRoute(room.slug));
    },
  });

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return;
    navigate(getRoomRoute(roomCode));
  };

  const handleCreateRoom = () => {
    createRoom.mutate({});
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />

      <main className="flex flex-1 flex-col md:flex-row items-center justify-center gap-4 px-4">
        <div className="flex flex-col">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Fast video meetings without the friction
          </h1>

          <p
            className="text-muted-foreground mb-8 max-w-md"
          >
            Create a room or join with a code — no installs, no setup
          </p>

          <div
            className="w-full max-w-md"
          >
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleJoinRoom();
                  }
                }}
              />

              <Button type="button" className="flex-1" onClick={handleJoinRoom}>
                Join
              </Button>
            </div>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400">или</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {isAuthenticated ? (
              <Button
                type="button"
                onClick={handleCreateRoom}
                disabled={createRoom.isPending}
              >
                <Plus className="size-4" />
                {createRoom.isPending ? "Creating..." : "Create Room"}
              </Button>
            ) : (
              <LinkButton to={ROUTES.REGISTER}>
                Create an account
              </LinkButton>
            )}
          </div>
        </div>

        <HeroBg className="max-w-120" />
      </main>

      <footer className="text-center text-sm text-gray-400 pb-6" >
        © 2026 Meetly
      </footer >
    </div>
  );
};
