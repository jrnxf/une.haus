import { Link } from "@tanstack/react-router";
import {
  ActivityIcon,
  EarthIcon,
  LockIcon,
  LockOpenIcon,
  MedalIcon,
  MessagesSquareIcon,
  ShoppingBagIcon,
  StickyNoteIcon,
  TrafficConeIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";

import { BracketIcon } from "~/components/icons/bracket-icon";
import { Logo } from "~/components/logo";
import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";
import { SearchTrigger } from "~/components/search-trigger";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Games",
      url: "/games",
      icon: MedalIcon,
      isActive: true,
    },
    {
      title: "Users",
      url: "/users",
      icon: UsersIcon,
    },
    {
      title: "Posts",
      url: "/posts",
      icon: StickyNoteIcon,
    },
    {
      title: "Chat",
      url: "/chat",
      icon: MessagesSquareIcon,
    },
    {
      title: "Map",
      url: "/map",
      icon: EarthIcon,
    },
    {
      title: "Tricks",
      url: "/tricks",
      icon: TrafficConeIcon,
    },
    {
      title: "Vault",
      url: "/vault",
      icon: LockIcon,
      activeIcon: LockOpenIcon,
    },
    {
      title: "Tourney",
      url: "/tourney",
      icon: BracketIcon,
    },
    {
      title: "Metrics",
      url: "/metrics",
      icon: ActivityIcon,
    },
    {
      title: "Shop",
      url: "/shop",
      icon: ShoppingBagIcon,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
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
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
