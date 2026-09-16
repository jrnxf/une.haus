import { Badge, type BadgeProps } from "~/components/ui/badge"
import { cn } from "~/lib/utils"

export function CountChip({
  className,
  ...props
}: Omit<BadgeProps, "variant">) {
  return (
    <Badge
      {...props}
      className={cn(
        // p-[5px] gives us a perfect circle on 0-9 counts
        "bg-info text-2xs hover:bg-info px-[5px] py-0 text-white",
        className,
      )}
    />
  )
}
