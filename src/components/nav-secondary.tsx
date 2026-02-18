import { Link } from "@tanstack/react-router";
import {
  JoystickIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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
    const next =
      themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
    setTheme(next);
  };

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1">
            {items.map((item) => (
              <Tooltip key={item.title}>
                <TooltipTrigger asChild>
                  <SidebarMenuButton asChild className="w-fit" size="sm">
                    <Link to={item.url} replace>
                      <item.icon />
                    </Link>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="top">{item.title}</TooltipContent>
              </Tooltip>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  className="w-fit"
                  size="sm"
                  onClick={cycleTheme}
                >
                  <ThemeIcon />
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="top">Color mode ({theme})</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton asChild className="w-fit" size="sm">
                  <Link to="/game">
                    <JoystickIcon />
                  </Link>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="top">Play</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
