import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
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
  ShieldIcon,
  SunIcon,
  TerminalIcon,
  UserIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { CountChip } from "~/components/ui/count-chip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar"
import { notifications } from "~/lib/notifications"
import { useIsAdmin, useLogout, useSessionUser } from "~/lib/session/hooks"
import { useTheme } from "~/lib/theme/context"
import { cn } from "~/lib/utils"

export function ThemeSubmenu() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {theme === "dark" ? (
          <MoonIcon className="size-3.5" />
        ) : theme === "light" ? (
          <SunIcon className="size-3.5" />
        ) : (
          <MonitorIcon className="size-3.5" />
        )}
        theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon className="size-3.5" />
            system
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <SunIcon className="size-3.5" />
            light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon className="size-3.5" />
            dark
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const sessionUser = useSessionUser()
  const isAdmin = useIsAdmin()
  const logout = useLogout()

  const { data: unreadCount = 0 } = useQuery({
    ...notifications.unreadCount.queryOptions(),
    enabled: !!sessionUser,
  })

  if (!sessionUser) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          {/* Keyed to force unmount on logout — without this, React reuses the
              authed DropdownMenu instance (same tree shape), preserving its
              open state and causing the menu to jump to (0,0). */}
          <DropdownMenu key="unauthed" modal={!isMobile}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="open account menu"
              >
                <PowerIcon className="size-3.5" />
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
                    <EyeOff className="size-3.5" />
                    privacy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/terms">
                    <ScrollText className="size-3.5" />
                    terms
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href="https://github.com/jrnxf/une.haus"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <TerminalIcon className="size-3.5" />
                    source
                  </a>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <ThemeSubmenu />

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/auth">
                  <LogIn className="size-3.5" />
                  log in
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* See "unauthed" key above */}
        <DropdownMenu key="authed" modal={!isMobile}>
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
                <AvatarFallback name={sessionUser.name} />
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {sessionUser.name}
                </span>
                <span className="truncate text-xs">{sessionUser.email}</span>
              </div>
              <ChevronsUpDown aria-hidden="true" className="ml-auto size-4" />
              {unreadCount > 0 && (
                <CountChip className="absolute -top-1 -right-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </CountChip>
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
                  <Send className="size-3.5" />
                  feedback
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/privacy">
                  <EyeOff className="size-3.5" />
                  privacy
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/terms">
                  <ScrollText className="size-3.5" />
                  terms
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/jrnxf/une.haus"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <TerminalIcon className="size-3.5" />
                  source
                </a>
              </DropdownMenuItem>
              <ThemeSubmenu />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/users/$userId" params={{ userId: sessionUser.id }}>
                  <UserIcon className="size-3.5" />
                  profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/notifications">
                  <Bell className="size-3.5" />
                  notifications
                  {unreadCount > 0 && (
                    <CountChip className="ml-auto">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </CountChip>
                  )}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/admin">
                    <ShieldIcon className="size-3.5" />
                    admin
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout({})}>
              <LogOut className="size-3.5" />
              log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
