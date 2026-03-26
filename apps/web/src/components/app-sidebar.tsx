import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  ActivityIcon,
  Bell,
  Joystick,
  LockIcon,
  MessagesSquareIcon,
  ShieldIcon,
  ShoppingBagIcon,
  StickyNoteIcon,
  TrafficConeIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"
import * as React from "react"

import { BracketIcon } from "~/components/icons/bracket-icon"
import { PodiumIcon } from "~/components/icons/podium-icon"
import { Logo } from "~/components/logo"
import { NavMain, type NavMainItem } from "~/components/nav-main"
import { NavUser } from "~/components/nav-user"
import { OnlineIndicator } from "~/components/online-indicator"
import { SearchTrigger } from "~/components/search-trigger"
import { CountChip } from "~/components/ui/count-chip"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar"
import { admin } from "~/lib/admin"
import { notifications } from "~/lib/notifications"
import { useIsAdmin, useSessionUser } from "~/lib/session/hooks"

const baseItems: NavMainItem[] = [
  {
    title: "games",
    url: "/games",
    icon: PodiumIcon,
    isActive: true,
  },
  {
    title: "users",
    url: "/users",
    icon: UsersIcon,
  },
  {
    title: "posts",
    url: "/posts",
    icon: StickyNoteIcon,
  },
  {
    title: "chat",
    url: "/chat",
    icon: MessagesSquareIcon,
  },
  {
    title: "tricks",
    url: "/tricks",
    icon: TrafficConeIcon,
  },
  {
    title: "vault",
    url: "/vault",
    icon: LockIcon,
  },
  {
    title: "tourney",
    url: "/tourney",
    icon: BracketIcon,
  },
  {
    title: "metrics",
    url: "/metrics",
    icon: ActivityIcon,
  },
  {
    title: "arcade",
    url: "/arcade",
    icon: Joystick,
  },
  {
    title: "shop",
    url: "/shop",
    icon: ShoppingBagIcon,
  },
]

function useNavItems(): NavMainItem[] {
  const sessionUser = useSessionUser()
  const isAdmin = useIsAdmin()

  const { data: unreadCount = 0 } = useQuery({
    ...notifications.unreadCount.queryOptions(),
    enabled: Boolean(sessionUser),
  })

  const { data: adminPendingCount = 0 } = useQuery({
    ...admin.pendingCount.queryOptions(),
    enabled: Boolean(isAdmin),
  })

  return React.useMemo(() => {
    if (!sessionUser) return baseItems

    const authedItems: NavMainItem[] = [
      ...baseItems,
      {
        title: "notifications",
        url: "/notifications",
        icon: Bell,
        trailing:
          unreadCount > 0 ? (
            <CountChip className="ml-auto">
              {unreadCount > 99 ? "99+" : unreadCount}
            </CountChip>
          ) : undefined,
      },
      {
        title: "profile",
        url: `/users/${sessionUser.id}`,
        icon: UserIcon,
      },
    ]

    if (isAdmin) {
      authedItems.push({
        title: "admin",
        url: "/admin",
        icon: ShieldIcon,
        trailing:
          adminPendingCount > 0 ? (
            <CountChip className="ml-auto">
              {adminPendingCount > 99 ? "99+" : adminPendingCount}
            </CountChip>
          ) : undefined,
      })
    }

    return authedItems
  }, [sessionUser, unreadCount, isAdmin, adminPendingCount])
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const sessionUser = useSessionUser()
  const navItems = useNavItems()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-end justify-between">
            <SidebarMenuButton
              className="w-fit data-[slot=sidebar-menu-button]:p-1.5!"
              asChild
            >
              <Link to="/" className="h-fit">
                <div>
                  <Logo className="h-8 fill-transparent! stroke-black! stroke-2 dark:stroke-white!" />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchTrigger />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        {sessionUser ? (
          <>
            <OnlineIndicator />
            <NavUser />
          </>
        ) : (
          <div className="flex items-center justify-between">
            <NavUser />
            <OnlineIndicator />
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
