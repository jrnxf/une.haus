import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";

import { cn, getUserInitials } from "~/lib/utils";

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  src,
  ...props
}: Omit<React.ComponentProps<typeof AvatarPrimitive.Image>, "src"> & {
  src?: null | string;
}) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      src={
        src
          ? `https://une.haus/cdn-cgi/imagedelivery/-HCgnZBcmFH51trvA-5j4Q/${src}/width=67,quality=70`
          : undefined
      }
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  name,
  ...props
}: Omit<React.ComponentProps<typeof AvatarPrimitive.Fallback>, "children"> & {
  name: string;
}) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    >
      {getUserInitials(name ?? "")}
    </AvatarPrimitive.Fallback>
  );
}

export { Avatar, AvatarFallback, AvatarImage };
