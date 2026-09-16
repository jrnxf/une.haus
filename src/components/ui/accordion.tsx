import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { useEffect, useState } from "react"

import {
  type AccordionVariant,
  AccordionVariantContext,
  useAccordionVariant,
} from "./accordion-context"
import { cn } from "~/lib/utils"

type AccordionProps = AccordionPrimitive.Root.Props & {
  variant?: AccordionVariant
}

function Accordion({
  className,
  variant = "default",
  ...props
}: AccordionProps) {
  return (
    <AccordionVariantContext.Provider value={variant}>
      <AccordionPrimitive.Root
        data-slot="accordion"
        data-variant={variant}
        className={cn(
          "flex w-full flex-col",
          variant === "card" && "gap-2",
          className,
        )}
        {...props}
      />
    </AccordionVariantContext.Provider>
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  const variant = useAccordionVariant()
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        variant === "card" ? "bg-card rounded-lg border" : "not-last:border-b",
        className,
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  const variant = useAccordionVariant()
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground relative flex flex-1 items-start justify-between rounded-md border border-transparent py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4",
          variant === "card" &&
            "items-center rounded-lg border-0 px-4 py-3 hover:no-underline",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUpIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  const variant = useAccordionVariant()
  const [canAnimate, setCanAnimate] = useState(false)

  useEffect(() => {
    setCanAnimate(true)
  }, [])

  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(
        "h-(--accordion-panel-height) overflow-hidden text-sm data-ending-style:h-0 data-starting-style:h-0",
        canAnimate && "transition-[height] duration-200 ease-out",
      )}
      {...props}
    >
      <div
        className={cn(
          "pt-0 pb-4 [&_p:not(:last-child)]:mb-4",
          variant === "card" && "px-4 pt-0.5",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
