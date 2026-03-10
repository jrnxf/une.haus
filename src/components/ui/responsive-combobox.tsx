import * as React from "react"

import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { useIsMobile } from "~/hooks/use-mobile"
import { cn } from "~/lib/utils"

type ResponsiveComboboxProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
  title?: string
  contentClassName?: string
}

export function ResponsiveCombobox({
  open,
  onOpenChange,
  trigger,
  children,
  title = "Select",
  contentClassName,
}: ResponsiveComboboxProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[60vh]">
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <div
            className={cn("flex flex-col overflow-hidden", contentClassName)}
          >
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className={cn(
          "flex max-h-[min(400px,calc(100vh-100px))] flex-col gap-0 overflow-hidden p-0",
          contentClassName,
        )}
        align="start"
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
