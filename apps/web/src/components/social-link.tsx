import { type IconType } from "@icons-pack/react-simple-icons"

import { Button } from "~/components/ui/button"

export function SocialLink({
  href,
  icon,
  label,
}: {
  href: null | string
  icon: IconType
  label: string
}) {
  if (!href) {
    return null
  }

  const Icon = icon

  return (
    <Button asChild size="icon-sm" variant="ghost">
      <a href={href} target="_blank" aria-label={label}>
        <Icon className="fill-muted-foreground size-4" />
      </a>
    </Button>
  )
}
