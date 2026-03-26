import { Link } from "@tanstack/react-router"
import {
  BookIcon,
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
  TerminalIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
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
import { useLogout, useSessionUser } from "~/lib/session/hooks"
import { useTheme } from "~/lib/theme/context"
import { cn } from "~/lib/utils"

function ThemeSubmenu() {
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
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={setTheme as (value: string) => void}
        >
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

export function AuthedUserMenuItems({
  logout,
}: {
  logout: (opts: Record<string, never>) => void
}) {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem render={<Link to="/feedback" />}>
          <Send className="size-3.5" />
          feedback
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/privacy" />}>
          <EyeOff className="size-3.5" />
          privacy
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/terms" />}>
          <ScrollText className="size-3.5" />
          terms
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <a
              href="https://docs.une.haus"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <BookIcon className="size-3.5" />
          docs
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <a
              href="https://github.com/jrnxf/une.haus"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <TerminalIcon className="size-3.5" />
          source
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <ThemeSubmenu />
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => logout({})}>
        <LogOut className="size-3.5" />
        log out
      </DropdownMenuItem>
    </>
  )
}

export function UnauthedUserMenuItems() {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem render={<Link to="/privacy" />}>
          <EyeOff className="size-3.5" />
          privacy
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/terms" />}>
          <ScrollText className="size-3.5" />
          terms
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <a
              href="https://docs.une.haus"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <BookIcon className="size-3.5" />
          docs
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <a
              href="https://github.com/jrnxf/une.haus"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <TerminalIcon className="size-3.5" />
          source
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <ThemeSubmenu />
      <DropdownMenuSeparator />
      <DropdownMenuItem render={<Link to="/auth" />}>
        <LogIn className="size-3.5" />
        auth
      </DropdownMenuItem>
    </>
  )
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const sessionUser = useSessionUser()
  const logout = useLogout()

  if (!sessionUser) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          {/* Keyed to force unmount on logout — without this, React reuses the
              authed DropdownMenu instance (same tree shape), preserving its
              open state and causing the menu to jump to (0,0). */}
          <DropdownMenu key="unauthed" modal={!isMobile}>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="open account menu"
                />
              }
            >
              <PowerIcon className="size-3.5" />
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
              <UnauthedUserMenuItems />
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
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground relative overflow-visible"
              />
            }
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
              <span className="truncate font-semibold">{sessionUser.name}</span>
              <span className="truncate text-xs">{sessionUser.email}</span>
            </div>
            <ChevronsUpDown aria-hidden="true" className="ml-auto size-4" />
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
            <AuthedUserMenuItems logout={logout} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
