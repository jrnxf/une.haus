import React, { useState } from "react"
import { useMediaQuery } from "usehooks-ts"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer"
import { cn } from "~/lib/utils"

const MEDIA_QUERY_DESKTOP = "(max-width: 768px)"

const TrayContext = React.createContext<{
  isMobile: boolean
  open: boolean
}>({
  isMobile: false,
  open: false,
})

const useTrayContext = () => React.useContext(TrayContext)

export function Tray(properties: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}) {
  const isMobile = useMediaQuery(MEDIA_QUERY_DESKTOP)

  const [open, setOpen] = useState(false)

  const resolvedOpen = properties.open ?? open
  const resolvedOnOpenChange = properties.onOpenChange ?? setOpen

  return (
    <TrayContext.Provider value={{ isMobile, open: resolvedOpen }}>
      {isMobile ? (
        <Drawer open={resolvedOpen} onOpenChange={resolvedOnOpenChange}>
          {properties.children}
        </Drawer>
      ) : (
        <Dialog open={resolvedOpen} onOpenChange={resolvedOnOpenChange}>
          {properties.children}
        </Dialog>
      )}
    </TrayContext.Provider>
  )
}

export function TrayClose(properties: React.ComponentProps<"button">) {
  const { isMobile } = useTrayContext()

  if (isMobile) {
    return <DrawerClose {...properties} />
  }
  return <DialogClose {...properties} />
}

export function TrayContent({
  className,
  dialogClassName,
  drawerClassName,
  children,
  ...properties
}: {
  dialogClassName?: string
  drawerClassName?: string
  children?: React.ReactNode
  className?: string
}) {
  const { isMobile } = useTrayContext()

  return (
    <>
      <TrayOverlay />
      {isMobile ? (
        <DrawerContent
          className={cn("p-4", className, drawerClassName)}
          overlay={false}
        >
          {children}
        </DrawerContent>
      ) : (
        <DialogContent
          className={cn(className, "p-4", dialogClassName)}
          overlay={false}
          {...properties}
        >
          {children}
        </DialogContent>
      )}
    </>
  )
}

export function TrayTitle(
  properties: React.ComponentProps<"h2"> & { className?: string },
) {
  const { isMobile } = useTrayContext()

  if (isMobile) {
    return <DrawerTitle {...properties} />
  }
  return <DialogTitle {...properties} />
}

export function TrayTrigger(
  properties: React.ComponentProps<"button"> & {
    asChild?: boolean
    children?: React.ReactNode
  },
) {
  const { isMobile } = useTrayContext()

  if (isMobile) {
    return <DrawerTrigger {...properties} />
  }
  return <DialogTrigger {...properties} />
}

function TrayOverlay() {
  const { open } = useTrayContext()
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/30 duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    />
  )
}
