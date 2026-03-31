import { Header } from "@/components/header";
import { CopyLink } from "@/components/ui/copy-link";

interface Props {
  roomUrl: string;
}

export function PrejoinRoomHeader({ roomUrl }: Props) {
  return (
    <Header>
      <CopyLink url={roomUrl} variant="compact" />
    </Header>
  );
}
