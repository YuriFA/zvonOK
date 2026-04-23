import { X } from "lucide-react";

export const AsidePanelContainer = (props: React.ComponentProps<"aside">) => {
  return (
    <aside
      className="ml-0 overflow-hidden rounded-lg bg-card transition-all duration-300 ease-in-out data-[state='open']:ring-1 data-[state='open']:ring-border max-md:absolute max-md:inset-2 max-md:translate-x-[300%] data-[state='open']:max-md:translate-x-0 md:max-w-0 md:flex-1 data-[state='open']:md:ml-4 data-[state='open']:md:max-w-80"
      {...props}
    />
  );
};

export const AsidePanel = (props: React.ComponentProps<"div">) => {
  return <div className="flex size-full flex-col" {...props} />;
};

export const AsidePanelHeader = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      {children}

      <button
        type="button"
        onClick={onClose}
        className="ml-auto rounded-sm p-1 text-muted-foreground hover:text-foreground"
        aria-label="Close panel"
      >
        <X className="size-4" />
      </button>
    </div>
  );
};
