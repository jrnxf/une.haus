import { type IconType } from "@icons-pack/react-simple-icons"

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
    <a
      className="bg-background ring-offset-background focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:ring-offset-3 focus-visible:outline-hidden"
      href={href}
      target="_blank"
    >
      <Icon className="fill-muted-foreground size-4" />
    </a>
  )
}
