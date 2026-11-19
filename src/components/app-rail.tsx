import { Link } from "@tanstack/react-router"
import {
  ActivityIcon,
  BellIcon,
  HouseIcon,
  Joystick,
  LockIcon,
  type LucideIcon,
  MessagesSquareIcon,
  PowerIcon,
  ShieldIcon,
  ShoppingBagIcon,
  StickyNoteIcon,
  TrafficConeIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import { BracketIcon } from "~/components/icons/bracket-icon"
import { PodiumIcon } from "~/components/icons/podium-icon"
import { Logo } from "~/components/logo"
import {
  AuthedUserMenuItems,
  UnauthedUserMenuItems,
} from "~/components/nav-user"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { useNavCounts } from "~/hooks/use-nav-counts"
import { useIsAdmin, useLogout, useSessionUser } from "~/lib/session/hooks"

type RailItem = {
  title: string
  url: string
  icon: LucideIcon
  exact?: boolean
}

// the six sections, plus home. tourney, arcade, metrics and shop live in the
// account menu at the foot of the rail.
const sections: RailItem[] = [
  { title: "home", url: "/", icon: HouseIcon, exact: true },
  { title: "games", url: "/games", icon: PodiumIcon },
  { title: "tricks", url: "/tricks", icon: TrafficConeIcon },
  { title: "posts", url: "/posts", icon: StickyNoteIcon },
  { title: "vault", url: "/vault", icon: LockIcon },
  { title: "riders", url: "/users", icon: UsersIcon },
  { title: "chat", url: "/chat", icon: MessagesSquareIcon },
]

const more: RailItem[] = [
  { title: "tourney", url: "/tourney", icon: BracketIcon },
  { title: "arcade", url: "/arcade", icon: Joystick },
  { title: "metrics", url: "/metrics", icon: ActivityIcon },
  { title: "shop", url: "/shop", icon: ShoppingBagIcon },
]

const railLink =
  "text-muted-foreground hover:bg-card hover:text-foreground data-active:bg-secondary data-active:text-foreground text-2xs relative flex w-15 flex-col items-center gap-1 rounded-xl pt-2 pb-1.5 font-mono transition-colors duration-150 active:scale-95"

function RailLink({ item, dot }: { item: RailItem; dot?: boolean }) {
  return (
    <Link
      to={item.url}
      className={railLink}
      activeOptions={{ exact: Boolean(item.exact) }}
      activeProps={{ "data-active": "true" }}
    >
      <item.icon className="size-5" />
      <span>{item.title}</span>
      {dot && (
        <span
          aria-hidden="true"
          className="bg-primary absolute top-1.5 right-3 size-2 rounded-full"
        />
      )}
    </Link>
  )
}

function RailAccount() {
  const sessionUser = useSessionUser()
  const logout = useLogout()

  return (
    // keyed so a logout unmounts the authed menu instead of reusing it
    <DropdownMenu key={sessionUser ? "authed" : "unauthed"}>
      <DropdownMenuTrigger
        aria-label="open account menu"
        className="hover:bg-card flex size-11 items-center justify-center rounded-full transition-colors duration-150 active:scale-95"
      >
        {sessionUser ? (
          <Avatar
            className="size-8"
            cloudflareId={sessionUser.avatarId}
            alt={sessionUser.name}
          >
            <AvatarImage width={64} quality={85} />
            <AvatarFallback name={sessionUser.name} />
          </Avatar>
        ) : (
          <PowerIcon className="size-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56"
        side="right"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          {sessionUser && (
            <DropdownMenuItem
              render={
                <Link to="/users/$userId" params={{ userId: sessionUser.id }}>
                  <UserIcon className="size-3.5" />
                  profile
                </Link>
              }
            />
          )}
          {more.map((item) => (
            <DropdownMenuItem
              key={item.url}
              render={
                <Link to={item.url}>
                  <item.icon className="size-3.5" />
                  {item.title}
                </Link>
              }
            />
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {sessionUser ? (
          <AuthedUserMenuItems logout={logout} />
        ) : (
          <UnauthedUserMenuItems />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppRail() {
  const sessionUser = useSessionUser()
  const isAdmin = useIsAdmin()
  const { unreadCount, adminPendingCount } = useNavCounts()

  return (
    <aside className="hidden w-19 shrink-0 flex-col items-center gap-1 pt-4 pb-3 md:flex">
      <Link to="/" aria-label="home" className="mb-3 block w-13">
        <Logo className="h-auto w-full" />
      </Link>
      <nav className="flex flex-col items-center gap-1" aria-label="sections">
        {sections.map((item) => (
          <RailLink key={item.url} item={item} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-1">
        {sessionUser && (
          <RailLink
            item={{ title: "alerts", url: "/notifications", icon: BellIcon }}
            dot={unreadCount > 0}
          />
        )}
        {isAdmin && (
          <RailLink
            item={{ title: "admin", url: "/admin", icon: ShieldIcon }}
            dot={adminPendingCount > 0}
          />
        )}
        <RailAccount />
      </div>
    </aside>
  )
}
