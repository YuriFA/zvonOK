import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { useCreateRoom } from "@/features/room/hooks/use-create-room";
import { ArrowRight, Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES, getRoomRoute } from "@/lib/config/routes";
import HeroBg from '@/../public/hero-bg.svg?react';
import { APP_NAME } from "@/lib/config/app";

export const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [roomCode, setRoomCode] = useState("");

  const createRoom = useCreateRoom({
    onSuccess: (room) => {
      toast.success('Room created!');
      navigate(getRoomRoute(room.slug));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create room');
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/30">
      <AuthHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-8 lg:py-16">
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="order-2 lg:order-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Video className="size-4" />
              Video meetings made simple
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight mb-4 lg:mb-6">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Fast video meetings
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                without the friction
              </span>
            </h1>

            <p className="text-muted-foreground text-base lg:text-lg max-w-md mb-8 lg:mb-10">
              Create a room or join with a code — no installs, no setup required.
              Just click and connect.
            </p>

            <div className="w-full max-w-sm space-y-4">
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
                  className="h-12 text-base"
                />
                <Button
                  type="button"
                  size="lg"
                  className="h-12 px-6"
                  onClick={handleJoinRoom}
                >
                  Join
                  <ArrowRight className="size-4 ml-1" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="w-full h-12"
                onClick={() => {
                  if (isAuthenticated) {
                    handleCreateRoom();
                  } else {
                    navigate(ROUTES.LOGIN);
                  }
                }}
                disabled={isAuthenticated && createRoom.isPending}
              >
                <Plus className="size-5" />
                {isAuthenticated && createRoom.isPending ? "Creating..." : "Create a new room"}
              </Button>
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 blur-3xl rounded-full" />
              <HeroBg className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-[28rem] lg:h-[28rem] xl:w-[32rem] xl:h-[32rem]" />
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>© 2026 {APP_NAME}</span>
          <div className="flex items-center gap-1 text-xs">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
};
