import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { Link } from "react-router";

export const Lobby = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [roomCode, setRoomCode] = useState("");

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return;
    navigate(`/room/${roomCode}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="max-w-[600px] p-4 space-y-4 w-11/12 border border-border rounded-lg">
          <p className="leading-7 text-center">Create or Join a Room</p>

          <div className="space-y-2 mx-auto max-w-[400px]">
            <Input
              type="text"
              placeholder="Enter room code..."
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleJoinRoom();
                }
              }}
            />
            {isAuthenticated ? (
              <Button type="button" className="w-full" onClick={handleJoinRoom}>
                Join Room
              </Button>
            ) : (
              <div className="text-center space-y-2">
                <Button type="button" className="w-full" asChild>
                  <Link to="/login">Login to Join Room</Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  or{" "}
                  <Link to="/register" className="text-primary underline-offset-4 hover:underline">
                    create an account
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
