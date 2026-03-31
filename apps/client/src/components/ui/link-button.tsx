import type { VariantProps } from "class-variance-authority";
import type { LinkProps } from "react-router";
import { Link } from "react-router";

import { cn } from "@/lib/utils";

import { buttonVariants } from "./button";

type LinkButtonProps = VariantProps<typeof buttonVariants> & LinkProps;

export function LinkButton({
  to,
  variant = "default",
  size = "default",
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link to={to} className={cn("", buttonVariants({ variant, size, className }))} {...props}>
      {children}
    </Link>
  );
}
