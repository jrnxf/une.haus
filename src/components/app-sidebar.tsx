import { Link } from "@tanstack/react-router";
import {
  ClipboardPenIcon,
  EarthIcon,
  GaugeIcon,
  LockIcon,
  LockOpenIcon,
  MapIcon,
  MedalIcon,
  MessagesSquareIcon,
  Send,
  ShoppingBagIcon,
  TimerIcon,
  TrafficConeIcon,
} from "lucide-react";
import * as React from "react";

import { Logo } from "~/components/logo";
import { NavMain } from "~/components/nav-main";
import { NavSecondary } from "~/components/nav-secondary";
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
      icon: EarthIcon,
    },
    {
      title: "Map",
      url: "/map",
      icon: MapIcon,
    },
    {
      title: "Posts",
      url: "/posts",
      icon: ClipboardPenIcon,
    },
    {
      title: "Chat",
      url: "/chat",
      icon: MessagesSquareIcon,
    },

    {
      title: "Stats",
      url: "/stats",
      icon: GaugeIcon,
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
      title: "Shop",
      url: "/shop",
      icon: ShoppingBagIcon,
    },
    {
      title: "Events",
      url: "/events",
      icon: TimerIcon,
    },
  ],
  navSecondary: [
    {
      title: "Feedback",
      url: "/feedback",
      icon: Send,
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
                  <Logo className="h-8" />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchTrigger />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
