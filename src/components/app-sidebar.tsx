import { Link } from "@tanstack/react-router";
import {
  ClipboardPenIcon,
  EarthIcon,
  KeySquareIcon,
  MedalIcon,
  MessagesSquareIcon,
  Send,
} from "lucide-react";
import * as React from "react";

import { Logo } from "~/components/logo";
import { NavMain } from "~/components/nav-main";
import { NavSecondary } from "~/components/nav-secondary";
import { NavUser } from "~/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Games",
      url: "/games/rius/active",
      icon: MedalIcon,
      isActive: true,
    },
    {
      title: "Users",
      url: "/users",
      icon: EarthIcon,
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
      title: "Vault",
      url: "/vault",
      icon: KeySquareIcon,
    },
  ],
  navSecondary: [
    {
      title: "Feedback",
      url: "#",
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
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              asChild
            >
              <Link to="/" className="h-fit">
                <div>
                  <Logo className="h-10" />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
