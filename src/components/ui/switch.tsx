import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { type ComponentRef } from "react"

import { cn } from "~/lib/utils"

function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props & { className?: string }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[checked]:bg-primary data-[unchecked]:bg-input",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "bg-background pointer-events-none block size-4 rounded-full shadow-lg ring-0 transition-transform",
          "data-[checked]:translate-x-4 data-[unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

type SwitchRef = ComponentRef<typeof SwitchPrimitive.Root>

export { Switch, type SwitchRef }
