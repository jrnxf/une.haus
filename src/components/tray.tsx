import React, { useState } from "react";

import { useMediaQuery } from "usehooks-ts";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { cn } from "~/lib/utils";

const MEDIA_QUERY_DESKTOP = "(max-width: 768px)";

const TrayContext = React.createContext<{
  isMobile: boolean;
  open: boolean;
}>({
  isMobile: false,
  open: false,
});

const useTrayContext = () => React.useContext(TrayContext);

export function Tray(
  properties:
    | React.ComponentProps<typeof Dialog>
    | React.ComponentProps<typeof Drawer>,
) {
  const isMobile = useMediaQuery(MEDIA_QUERY_DESKTOP);

  const [open, setOpen] = useState(false);

  const Comp = isMobile ? Drawer : Dialog;

  return (
    <TrayContext.Provider value={{ isMobile, open }}>
      <Comp
        {...properties}
        onOpenChange={properties.onOpenChange ?? setOpen}
        open={properties.open ?? open}
      >
        {properties.children}
      </Comp>
    </TrayContext.Provider>
  );
}

export function TrayClose(
  properties:
    | React.ComponentProps<typeof DialogClose>
    | React.ComponentProps<typeof DrawerClose>,
) {
  const { isMobile } = useTrayContext();

  const Comp = isMobile ? DrawerClose : DialogClose;

  return <Comp {...properties} />;
}

export function TrayContent({
  className,
  dialogClassName,
  drawerClassName,
  ...properties
}: {
  dialogClassName?: string;
  drawerClassName?: string;
} & (
  | React.ComponentProps<typeof DialogContent>
  | React.ComponentProps<typeof DrawerContent>
)) {
  const { isMobile } = useTrayContext();

  return (
    <>
      <TrayOverlay />
      {isMobile ? (
        <DrawerContent
          className={cn("p-4", className, drawerClassName)}
          {...properties}
          overlay={false}
          autoFocus={false}
          onOpenAutoFocus={(evt) => {
            evt.preventDefault();
          }}
        />
      ) : (
        <DialogContent
          className={cn(className, dialogClassName)}
          {...properties}
          overlay={false}
          autoFocus={false}
          onOpenAutoFocus={(evt) => {
            ev.preventDefault();
          }}
        />
      )}
    </>
  );
}

export function TrayTitle(
  properties:
    | React.ComponentProps<typeof DialogTitle>
    | React.ComponentProps<typeof DrawerTitle>,
) {
  const { isMobile } = useTrayContext();

  const Comp = isMobile ? DrawerTitle : DialogTitle;

  return <Comp {...properties} />;
}

export function TrayTrigger(
  properties:
    | React.ComponentProps<typeof DialogTrigger>
    | React.ComponentProps<typeof DrawerTrigger>,
) {
  const { isMobile } = useTrayContext();

  const Comp = isMobile ? DrawerTrigger : DialogTrigger;

  return <Comp {...properties} />;
}

function TrayOverlay() {
  const { open } = useTrayContext();
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/50 duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    />
  );
}
