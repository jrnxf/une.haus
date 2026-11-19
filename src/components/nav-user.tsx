import { Link } from "@tanstack/react-router"
import {
  EyeOff,
  LogIn,
  LogOut,
  MonitorIcon,
  MoonIcon,
  ScrollText,
  Send,
  SunIcon,
  TerminalIcon,
} from "lucide-react"

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "~/components/ui/dropdown-menu"
import { useTheme } from "~/lib/theme/context"

function SourceMenuItem() {
  const showSha = import.meta.env.PROD && __COMMIT_SHA__ !== "unknown"

  return (
    <DropdownMenuItem
      render={
        <a
          href="https://github.com/jrnxf/une.haus"
          target="_blank"
          rel="noopener noreferrer"
        >
          <TerminalIcon className="size-3.5" />
          source
          {showSha && (
            <span className="text-muted-foreground text-2xs ml-auto pl-4 font-mono">
              {__COMMIT_SHA__}
            </span>
          )}
        </a>
      }
    />
  )
}

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
        <DropdownMenuItem
          render={
            <Link to="/feedback">
              <Send className="size-3.5" />
              feedback
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link to="/privacy">
              <EyeOff className="size-3.5" />
              privacy
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link to="/terms">
              <ScrollText className="size-3.5" />
              terms
            </Link>
          }
        />
        <SourceMenuItem />
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
        <DropdownMenuItem
          render={
            <Link to="/privacy">
              <EyeOff className="size-3.5" />
              privacy
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link to="/terms">
              <ScrollText className="size-3.5" />
              terms
            </Link>
          }
        />
        <SourceMenuItem />
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <ThemeSubmenu />
      <DropdownMenuSeparator />
      <DropdownMenuItem
        render={
          <Link to="/auth">
            <LogIn className="size-3.5" />
            auth
          </Link>
        }
      />
    </>
  )
}
