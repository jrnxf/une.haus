import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronsUpDown,
  EyeOff,
  LogIn,
  LogOut,
  MonitorIcon,
  MoonIcon,
  PowerIcon,
  ScrollText,
  Send,
  SunIcon,
  UserIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { notifications } from "~/lib/notifications";
import { useLogout, useSessionUser } from "~/lib/session/hooks";
import { useTheme } from "~/lib/theme/context";
import { cn } from "~/lib/utils";

export function ThemeSubmenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {theme === "dark" ? (
          <MoonIcon className="size-4" />
        ) : theme === "light" ? (
          <SunIcon className="size-4" />
        ) : (
          <MonitorIcon className="size-4" />
        )}
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <MonitorIcon className="size-4" />
          System
          {theme === "system" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <SunIcon className="size-4" />
          Light
          {theme === "light" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <MoonIcon className="size-4" />
          Dark
          {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function NavUser() {
  const { isMobile } = useSidebar();
  const sessionUser = useSessionUser();
  const logout = useLogout();

  const { data: unreadCount = 0 } = useQuery({
    ...notifications.unreadCount.queryOptions(),
    enabled: !!sessionUser,
  });

  if (!sessionUser) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu modal={!isMobile}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <PowerIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn(
                "min-w-48 rounded-lg",
                isMobile && "z-(--z-overlay)",
              )}
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to="/privacy">
                    <EyeOff className="size-4" />
                    Privacy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/terms">
                    <ScrollText className="size-4" />
                    Terms
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <ThemeSubmenu />

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/auth">
                  <LogIn className="size-4" />
                  Log in
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={!isMobile}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground relative overflow-visible"
            >
              <Avatar
                className="h-8 w-8 rounded-lg"
                cloudflareId={sessionUser.avatarId}
                alt={sessionUser.name}
              >
                <AvatarImage width={64} quality={85} />
                <AvatarFallback
                  name={sessionUser.name}
                  className="rounded-lg"
                />
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {sessionUser.name}
                </span>
                <span className="truncate text-xs">{sessionUser.email}</span>
              </div>
              <ChevronsUpDown aria-hidden="true" className="ml-auto size-4" />
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-[10px] font-medium">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              "w-[--anchor-width] min-w-56 rounded-lg",
              isMobile && "z-(--z-overlay)",
            )}
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/feedback">
                  <Send className="size-4" />
                  Feedback
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/privacy">
                  <EyeOff className="size-4" />
                  Privacy
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/terms">
                  <ScrollText className="size-4" />
                  Terms
                </Link>
              </DropdownMenuItem>
              <ThemeSubmenu />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/users/$userId" params={{ userId: sessionUser.id }}>
                  <UserIcon className="size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/notifications">
                  <Bell className="size-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground ml-auto rounded-full px-1.5 py-0.5 text-xs">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout({})}>
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
