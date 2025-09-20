import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";

export const Lobby = () => {
  const navigate = useNavigate();

  const handleSubmit = (formData: FormData) => {
    const inviteLink = formData.get("invite_link");
    navigate(`/room/${inviteLink}`);
  };

  return (
    <div className="space-y-4 flex items-center justify-center h-dvh">
      <div className="max-w-[600px] p-4 space-y-4 w-11/12 border border-border rounded-lg">
        <p className="leading-7 text-center">Create or Join a Room</p>

        <form className="space-y-2 mx-auto max-w-[400px]" action={handleSubmit}>
          <Input type="text" name="invite_link" required />
          <Button type="submit" className="w-full">
            Join
          </Button>
        </form>
      </div>
    </div>
  );
};
