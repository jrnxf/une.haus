"use client";

import { Link } from "@tanstack/react-router";
import {
  ClipboardPenIcon,
  EarthIcon,
  KeySquareIcon,
  MedalIcon,
  MessagesSquareIcon,
  Send,
  SquareTerminal,
} from "lucide-react";
import * as React from "react";

import { MatrixText } from "~/components/matrix-text";
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
  SidebarRail,
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
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg bg-zinc-700">
                  <SquareTerminal className="size-4" />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <MatrixText text="une.haus" dropHeight={24} />
                  <MatrixText
                    text="jrnxf"
                    dropHeight={24}
                    className="text-[.6rem]"
                  />
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
      <SidebarRail />
    </Sidebar>
  );
}
