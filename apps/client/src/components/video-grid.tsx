import { cn } from "@/lib/utils";

export function VideoGrid({ children, className, ref }: React.ComponentProps<"div">) {
  return (
    <div className={cn("relative size-full flex-1", className)} ref={ref}>
      {children}
    </div>
  );
}

interface VideoTileProps extends React.ComponentProps<"div"> {
  isActiveSpeaker?: boolean;
}

export function VideoTile({
  children,
  className,
  isActiveSpeaker = false,
  ...rest
}: VideoTileProps) {
  return (
    <div
      className={cn(
        "relative aspect-video max-h-full overflow-hidden rounded-lg",
        isActiveSpeaker && "ring-4 ring-green-500 ring-offset-2 ring-offset-background",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
