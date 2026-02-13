import { Link } from "@tanstack/react-router";
import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useTheme, type Theme } from "~/lib/theme/context";

const themeOrder: Theme[] = ["system", "dark", "light"];
const themeIcon: Record<Theme, LucideIcon> = {
  system: MonitorIcon,
  dark: MoonIcon,
  light: SunIcon,
};

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { theme, setTheme } = useTheme();
  const ThemeIcon = themeIcon[theme];

  const cycleTheme = () => {
    const next = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
    setTheme(next);
  };

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1">
            {items.map((item) => (
              <SidebarMenuButton
                key={item.title}
                asChild
                className="w-fit"
                size="sm"
              >
                <Link to={item.url} replace>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            ))}
            <SidebarMenuButton
              className="w-fit"
              size="sm"
              onClick={cycleTheme}
              tooltip={theme}
            >
              <ThemeIcon />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
