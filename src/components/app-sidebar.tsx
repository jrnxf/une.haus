import { Link } from "@tanstack/react-router"
import {
  ActivityIcon,
  EarthIcon,
  Joystick,
  LockIcon,
  MessagesSquareIcon,
  ShieldIcon,
  ShoppingBagIcon,
  StickyNoteIcon,
  TrafficConeIcon,
  UsersIcon,
} from "lucide-react"
import * as React from "react"

import { BracketIcon } from "~/components/icons/bracket-icon"
import { PodiumIcon } from "~/components/icons/podium-icon"
import { Logo } from "~/components/logo"
import { NavMain } from "~/components/nav-main"
import { NavUser } from "~/components/nav-user"
import { OnlineIndicator } from "~/components/online-indicator"
import { SearchTrigger } from "~/components/search-trigger"
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
import { useIsAdmin } from "~/lib/session/hooks"

const data = {
  navMain: [
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
      title: "map",
      url: "/map",
      icon: EarthIcon,
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
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isAdmin = useIsAdmin()

  const items = isAdmin
    ? [...data.navMain, { title: "admin", url: "/admin", icon: ShieldIcon }]
    : data.navMain

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
            <OnlineIndicator />
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchTrigger />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
