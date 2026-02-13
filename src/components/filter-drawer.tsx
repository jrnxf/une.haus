import { type ReactNode } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { useIsMobile } from "~/hooks/use-mobile";

export function FilterPanel({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>Filters</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-3 px-4 pb-6">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return <div className="flex flex-col gap-3">{children}</div>;
}
