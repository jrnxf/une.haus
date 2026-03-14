import { type IconType } from "@icons-pack/react-simple-icons"

import { Button } from "~/components/ui/button"

export function SocialLink({
  href,
  icon,
}: {
  href: null | string
  icon: IconType
}) {
  if (!href) {
    return null
  }

  const Icon = icon

  return (
    <Button asChild size="icon-sm" variant="ghost" aria-label="social link">
      <a href={href} target="_blank">
        <Icon className="fill-muted-foreground size-4" />
      </a>
    </Button>
  )
}
