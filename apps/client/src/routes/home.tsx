import { ArrowRight, Plus, Video } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import HeroBg from "@/assets/hero-bg.svg?react";
import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { useCreateRoom } from "@/features/room/hooks/use-create-room";
import { APP_NAME } from "@/lib/config/app";
import { ROUTES, getRoomRoute } from "@/lib/config/routes";

export const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [roomCode, setRoomCode] = useState("");

  const createRoom = useCreateRoom({
    onSuccess: (room) => {
      toast.success("Room created!");
      navigate(getRoomRoute(room.slug));
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create room");
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
    <div className="flex min-h-dscreen flex-col bg-gradient-to-b from-background via-background to-muted/30">
      <MainHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-8 lg:py-16">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
              <Video className="size-4" />
              Video meetings made simple
            </div>

            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:mb-6 lg:text-5xl xl:text-6xl">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Fast video meetings
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                without the friction
              </span>
            </h1>

            <p className="mb-8 max-w-md text-base text-muted-foreground lg:mb-10 lg:text-lg">
              Create a room or join with a code — no installs, no setup required. Just click and
              connect.
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
                <Button type="button" size="lg" className="h-12 px-6" onClick={handleJoinRoom}>
                  Join
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs tracking-wider text-muted-foreground uppercase">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="h-12 w-full"
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

          <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-primary/5 blur-3xl" />
              <HeroBg className="relative h-72 w-72 sm:h-80 sm:w-80 lg:h-[28rem] lg:w-[28rem] xl:h-[32rem] xl:w-[32rem]" />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row">
          <span>© 2026 {APP_NAME}</span>
          <div className="flex items-center gap-1 text-xs">
            <span className="size-2 animate-pulse rounded-full bg-green-500" />
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
};
