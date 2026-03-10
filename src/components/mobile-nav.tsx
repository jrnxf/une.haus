import { DrawerPreview as DrawerPrimitive } from "@base-ui/react/drawer"
import { useQuery } from "@tanstack/react-query"
import { Link, useMatches } from "@tanstack/react-router"
import {
  ActivityIcon,
  Joystick,
  LockIcon,
  type LucideIcon,
  MenuIcon,
  MessagesSquareIcon,
  PowerIcon,
  ShoppingBagIcon,
  StickyNoteIcon,
  TrafficConeIcon,
  UsersIcon,
} from "lucide-react"
import { type ReactNode } from "react"

import { BracketIcon } from "~/components/icons/bracket-icon"
import { PodiumIcon } from "~/components/icons/podium-icon"
import { MobileNavContext, useMobileNav } from "~/components/mobile-nav-context"
import {
  AuthedUserMenuItems,
  UnauthedUserMenuItems,
} from "~/components/nav-user"
import { OnlineIndicator } from "~/components/online-indicator"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { CountChip } from "~/components/ui/count-chip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { usePeripherals } from "~/hooks/use-peripherals"
import { useHaptics } from "~/lib/haptics"
import { notifications } from "~/lib/notifications"
import { useIsAdmin, useLogout, useSessionUser } from "~/lib/session/hooks"
import { cn } from "~/lib/utils"

const navItems = [
  { title: "games", url: "/games", icon: PodiumIcon },
  { title: "metrics", url: "/metrics", icon: ActivityIcon },
  { title: "users", url: "/users", icon: UsersIcon },
  { title: "tricks", url: "/tricks", icon: TrafficConeIcon },
  { title: "posts", url: "/posts", icon: StickyNoteIcon },
  { title: "tourney", url: "/tourney", icon: BracketIcon },
  { title: "chat", url: "/chat", icon: MessagesSquareIcon },
  { title: "arcade", url: "/arcade", icon: Joystick },
  { title: "vault", url: "/vault", icon: LockIcon },
  { title: "shop", url: "/shop", icon: ShoppingBagIcon },
] as const

function NavItem({
  title,
  url,
  icon: Icon,
  isActive,
}: {
  title: string
  url: string
  icon: LucideIcon
  isActive: boolean
}) {
  return (
    <Link
      to={url}
      replace
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-foreground hover:bg-accent/50",
      )}
    >
      <Icon className="size-4" />
      <span>{title}</span>
    </Link>
  )
}

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = usePeripherals("nav")
  const haptics = useHaptics()

  return (
    <MobileNavContext.Provider
      value={() => {
        haptics.selection()
        setOpen(true)
      }}
    >
      <DrawerPrimitive.Provider>
        <DrawerPrimitive.Root
          open={open}
          onOpenChange={(next) => {
            if (!next) haptics.selection()
            setOpen(next)
          }}
          modal={false}
          swipeDirection="down"
        >
          {children}
        </DrawerPrimitive.Root>
      </DrawerPrimitive.Provider>
    </MobileNavContext.Provider>
  )
}

export function MobileNavIndentBackground({
  className,
}: {
  className?: string
}) {
  return (
    <DrawerPrimitive.IndentBackground
      className={cn("bg-muted/30 fixed inset-0", className)}
    />
  )
}

export function MobileNavIndent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <DrawerPrimitive.Indent
      className={cn(
        "relative flex h-full flex-col overflow-hidden transition-all duration-300 ease-out data-[active]:translate-y-3 data-[active]:scale-[0.94] data-[active]:rounded-xl",
        className,
      )}
    >
      {children}
    </DrawerPrimitive.Indent>
  )
}

export function MobileNavTrigger({ className }: { className?: string }) {
  const openNav = useMobileNav()
  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label="open navigation menu"
      onClick={openNav}
      className={cn("md:hidden", className)}
    >
      <MenuIcon />
    </Button>
  )
}

function MobileNavFooter() {
  const sessionUser = useSessionUser()
  const isAdmin = useIsAdmin()
  const logout = useLogout()

  const { data: unreadCount = 0 } = useQuery({
    ...notifications.unreadCount.queryOptions(),
    enabled: !!sessionUser,
  })

  return (
    <div className="mt-2 flex items-center border-t pt-3">
      <OnlineIndicator />
      <div className="ml-auto">
        {sessionUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-accent/50 relative flex items-center gap-2 rounded-md p-1 pr-2">
                <Avatar
                  className="size-7 rounded-lg"
                  cloudflareId={sessionUser.avatarId}
                  alt={sessionUser.name}
                >
                  <AvatarImage width={64} quality={85} />
                  <AvatarFallback
                    name={sessionUser.name}
                    className="rounded-lg text-xs"
                  />
                </Avatar>
                <span className="truncate text-sm font-medium">
                  {sessionUser.name}
                </span>
                {unreadCount > 0 && (
                  <CountChip className="absolute -top-0.5 -right-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </CountChip>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="z-(--z-overlay) min-w-48 rounded-lg"
              side="top"
              align="end"
              sideOffset={4}
            >
              <AuthedUserMenuItems
                sessionUser={sessionUser}
                isAdmin={isAdmin}
                logout={logout}
                unreadCount={unreadCount}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="open account menu"
              >
                <PowerIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="z-(--z-overlay) min-w-48 rounded-lg"
              side="top"
              align="end"
              sideOffset={4}
            >
              <UnauthedUserMenuItems />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

export function MobileNavPopup({
  portalContainer,
}: {
  portalContainer: HTMLElement | null
}) {
  const matches = useMatches()
  const currentPath = matches.at(-1)?.pathname ?? "/"
  const items = navItems

  return (
    <DrawerPrimitive.Portal container={portalContainer}>
      <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 bg-black opacity-[calc(0.3*(1-var(--drawer-swipe-progress)))] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-[starting-style]:opacity-0 data-[swiping]:duration-0" />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end">
        <DrawerPrimitive.Popup className="bg-background flex max-h-[90vh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] flex-col rounded-t-xl border-t transition-transform duration-200 ease-in-out outline-none data-[ending-style]:[transform:translateY(100%)] data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-[starting-style]:[transform:translateY(100%)]">
          <div
            aria-hidden
            className="bg-muted mx-auto my-4 h-1.5 w-12 rounded-full"
          />
          <DrawerPrimitive.Content>
            <nav className="overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 gap-1">
                {items.map((item) => (
                  <NavItem
                    key={item.title}
                    title={item.title}
                    url={item.url}
                    icon={item.icon}
                    isActive={currentPath.startsWith(item.url)}
                  />
                ))}
              </div>
              <MobileNavFooter />
            </nav>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  )
}
