import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { useVirtualizer } from "@tanstack/react-virtual"
import { CheckIcon } from "lucide-react"
import * as React from "react"
import { Suspense, useMemo, useRef } from "react"
import { useHotkeys } from "react-hotkeys-hook"

import { Button } from "~/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Kbd,
  KbdGroup,
} from "~/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { useSidebar } from "~/components/ui/sidebar"
import { useModifierKey } from "~/hooks/use-modifier-key"
import { usePeripherals } from "~/hooks/use-peripherals"
import { useIsAdmin, useLogout, useSessionUser } from "~/lib/session/hooks"
import { useTheme } from "~/lib/theme/context"
import { users as usersApi } from "~/lib/users"
import { cn } from "~/lib/utils"
import { utv } from "~/lib/utv/core"
import { useFzf } from "~/lib/ux/hooks/use-fzf"

type Page =
  | "arcade"
  | "arcade-menu"
  | "posts"
  | "root"
  | "search-users"
  | "search-vault"
  | "theme"
  | "tricks"
  | "users"
  | "vault"

type SecondaryAction = {
  id: string
  label: string
  shortcut?: { key: string; meta?: boolean; shift?: boolean }
  hotkey?: string // e.g., "mod+s"
  onAction: () => void
}

type CommandItemConfig = {
  id: string
  label: string
  value: string
  primaryAction: {
    label: string
    onAction: () => void
  }
  secondaryActions?: SecondaryAction[]
}

export function CommandPalette() {
  const sessionUser = useSessionUser()
  const isAuthenticated = Boolean(sessionUser)
  const isAdmin = useIsAdmin()

  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const logout = useLogout()
  const { toggleSidebar } = useSidebar()

  const [pages, setPages] = React.useState<Page[]>(["root"])
  const [input, setInput] = React.useState("")
  const [selectedValue, setSelectedValue] = React.useState<string>("")
  const [actionsOpen, setActionsOpen] = React.useState(false)
  const activePage = pages.at(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = usePeripherals("search")

  const reset = () => {
    setPages(["root"])
    setInput("")
    setSelectedValue("")
    setActionsOpen(false)
  }

  // Keyboard shortcut to open menu
  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault()
      if (!open) reset()
      setOpen(!open)
    },
    { enableOnFormTags: true },
    [open, setOpen],
  )

  const pushPage = (page: Page) => {
    setPages((pages) => [...pages, page])
    setInput("")
    setSelectedValue("")
  }

  const popPage = () => {
    setPages((pages) => pages.slice(0, -1))
    setInput("")
    setSelectedValue("")
  }

  // Close the menu without triggering history.back()
  // Clear the 'p' param directly instead of calling setOpen
  // State is NOT reset here — it resets on next open so content stays
  // visible during the close animation.
  const closeMenu = () => {
    setActionsOpen(false)
    navigate({
      search: (prev: Record<string, unknown>) => {
        const { p: _p, ...rest } = prev
        return rest
      },
      replace: true,
    } as Parameters<typeof navigate>[0])
  }

  // Navigate and close the menu without triggering history.back()
  // State is NOT reset here — it resets on next open so content stays
  // visible during the close animation.
  const closeAndNavigate = (to: string) => {
    setActionsOpen(false)
    navigate({
      to,
      replace: true,
      search: (prev: Record<string, unknown>) => {
        const { p: _p, ...rest } = prev
        return rest
      },
    } as Parameters<typeof navigate>[0])
  }

  // Define command items with their actions
  const commandItems: CommandItemConfig[] = [
    {
      id: "games",
      label: "games",
      value: "/games",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/games"),
      },
      secondaryActions: [
        {
          id: "arcade-menu",
          label: "search",
          shortcut: { key: "s", meta: true },
          hotkey: "mod+s",
          onAction: () => pushPage("arcade-menu"),
        },
      ],
    },
    {
      id: "users",
      label: "users",
      value: "/users",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/users"),
      },
      secondaryActions: [
        {
          id: "search-users",
          label: "search",
          shortcut: { key: "s", meta: true },
          hotkey: "mod+s",
          onAction: () => pushPage("search-users"),
        },
      ],
    },
    {
      id: "posts",
      label: "posts",
      value: "/posts",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/posts"),
      },
    },
    {
      id: "chat",
      label: "chat",
      value: "/chat",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/chat"),
      },
    },
    {
      id: "vault",
      label: "vault",
      value: "/vault",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/vault"),
      },
      secondaryActions: [
        {
          id: "search-vault",
          label: "search",
          shortcut: { key: "s", meta: true },
          hotkey: "mod+s",
          onAction: () => pushPage("search-vault"),
        },
      ],
    },
    {
      id: "tricks",
      label: "tricks",
      value: "/tricks",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/tricks"),
      },
    },
    {
      id: "metrics",
      label: "metrics",
      value: "/metrics",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/metrics"),
      },
    },
    {
      id: "tourney",
      label: "tourney",
      value: "/tourney",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/tourney"),
      },
    },
    ...(isAuthenticated
      ? [
          {
            id: "notifications",
            label: "notifications",
            value: "/notifications",
            primaryAction: {
              label: "open",
              onAction: () => closeAndNavigate("/notifications"),
            },
          },
        ]
      : []),
    {
      id: "feedback",
      label: "feedback",
      value: "/feedback",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/feedback"),
      },
    },
    {
      id: "shop",
      label: "shop",
      value: "/shop",
      primaryAction: {
        label: "open",
        onAction: () => closeAndNavigate("/shop"),
      },
    },
    ...(isAdmin
      ? [
          {
            id: "admin",
            label: "admin",
            value: "/admin",
            primaryAction: {
              label: "open",
              onAction: () => closeAndNavigate("/admin"),
            },
          },
          {
            id: "sandbox",
            label: "sandbox",
            value: "/sandbox",
            primaryAction: {
              label: "open",
              onAction: () => closeAndNavigate("/sandbox"),
            },
          },
        ]
      : []),
  ]

  // Map selected value to item - cmdk lowercases values for matching
  const selectedItem = commandItems.find(
    (item) => item.value.toLowerCase() === selectedValue.toLowerCase(),
  )

  const hasSecondaryActions =
    selectedItem?.secondaryActions && selectedItem.secondaryActions.length > 0

  // Cmd+A to toggle actions dropdown
  useHotkeys(
    "mod+a",
    (e) => {
      if (!open || activePage !== "root" || !hasSecondaryActions) return
      e.preventDefault()
      setActionsOpen((prev) => !prev)
    },
    {
      enableOnFormTags: true,
      enabled: open && activePage === "root" && hasSecondaryActions,
    },
    [open, activePage, hasSecondaryActions],
  )

  const metaSymbol = useModifierKey()

  const formatShortcut = (shortcut: SecondaryAction["shortcut"]) => {
    if (!shortcut) return null
    const parts: string[] = []
    if (shortcut.meta) parts.push(metaSymbol)
    if (shortcut.shift) parts.push("⇧")
    parts.push(shortcut.key.toUpperCase())
    return parts
  }

  const handleDropdownSelect = (action: SecondaryAction) => {
    action.onAction()
    setActionsOpen(false)
    // Return focus to input after selecting from dropdown
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const getPrimaryActionLabel = () => {
    if (activePage === "root" && selectedItem) {
      return selectedItem.primaryAction.label
    }
    if (activePage === "search-users") {
      return "go to user"
    }
    if (activePage === "search-vault") {
      return "go to video"
    }
    if (activePage === "theme") {
      return "select"
    }
    if (activePage === "arcade-menu") {
      return "open game"
    }
    return "select"
  }

  const footer = (
    <div className="bg-input/30 flex w-full items-center justify-end gap-1 border-t px-2 py-1.5">
      {/* Back action for sub-pages */}
      {pages.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={popPage}
          className="mr-auto gap-1.5"
        >
          <span>back</span>
          <Kbd>⌫</Kbd>
        </Button>
      )}

      {/* Primary action */}
      <Button variant="ghost" size="sm" className="gap-1.5">
        <span>{getPrimaryActionLabel()}</span>
        <Kbd>↵</Kbd>
      </Button>

      {/* Actions dropdown */}
      {activePage === "root" && hasSecondaryActions && (
        <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <span>actions</span>
              <KbdGroup>
                <Kbd>{metaSymbol}</Kbd>
                <Kbd>a</Kbd>
              </KbdGroup>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-[200px]">
            {selectedItem?.secondaryActions?.map((action) => {
              const shortcutParts = formatShortcut(action.shortcut)
              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => handleDropdownSelect(action)}
                >
                  {action.label}
                  {shortcutParts && (
                    <DropdownMenuShortcut className="flex items-center gap-1.5">
                      {shortcutParts.map((part, i) => (
                        <Kbd key={i}>{part}</Kbd>
                      ))}
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <CommandDialog
        onOpenChange={(open) => {
          if (open) reset()
          setOpen(open)
        }}
        open={open}
        overlay={false}
        title="command palette"
        showCloseButton={false}
        showTrigger={false}
        footer={footer}
        value={selectedValue}
        onValueChange={setSelectedValue}
        shouldFilter={
          activePage !== "search-users" && activePage !== "search-vault"
        }
      >
        <CommandInput
          ref={inputRef}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && input === "" && pages.length > 1) {
              popPage()
            }
            // Handle meta+s for secondary actions
            if (
              e.key === "s" &&
              (e.metaKey || e.ctrlKey) &&
              activePage === "root" &&
              selectedItem
            ) {
              const searchAction = selectedItem.secondaryActions?.find(
                (a) => a.hotkey === "mod+s",
              )
              if (searchAction) {
                e.preventDefault()
                e.stopPropagation()
                searchAction.onAction()
                setActionsOpen(false)
              }
            }
          }}
          onValueChange={(value) => {
            setInput(value)
            requestAnimationFrame(() => {
              listRef.current?.scrollTo({ top: 0 })
            })
          }}
          placeholder={
            activePage === "search-users"
              ? "search users..."
              : activePage === "search-vault"
                ? "search vault..."
                : "search for anything..."
          }
          value={input}
        />
        <CommandList ref={listRef}>
          {activePage !== "search-users" && activePage !== "search-vault" && (
            <CommandEmpty>no results found.</CommandEmpty>
          )}

          {activePage === "root" && (
            <>
              <CommandGroup heading="pages">
                {commandItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.value}
                    onSelect={item.primaryAction.onAction}
                    className="group"
                    asChild
                  >
                    <Link to={item.value} replace>
                      {item.label}
                    </Link>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="settings">
                <CommandItem
                  onSelect={() => {
                    toggleSidebar()
                    closeMenu()
                  }}
                >
                  toggle sidebar
                  <CommandShortcut>
                    <KbdGroup>
                      <Kbd>G</Kbd>
                      <Kbd>S</Kbd>
                    </KbdGroup>
                  </CommandShortcut>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    pushPage("theme")
                  }}
                >
                  theme
                </CommandItem>
                {isAuthenticated ? (
                  <>
                    <CommandItem
                      value="/auth/me"
                      onSelect={() => closeAndNavigate("/auth/me")}
                      asChild
                    >
                      <Link replace to="/auth/me">
                        profile
                      </Link>
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        logout({})
                        closeMenu()
                      }}
                    >
                      logout
                    </CommandItem>
                  </>
                ) : (
                  <CommandItem
                    value="/auth"
                    onSelect={() => closeAndNavigate("/auth")}
                    asChild
                  >
                    <Link replace to="/auth">
                      login
                    </Link>
                  </CommandItem>
                )}
              </CommandGroup>
            </>
          )}

          {activePage === "theme" && (
            <CommandGroup heading="theme">
              {(["light", "dark", "system"] as const).map((value) => (
                <CommandItem
                  key={value}
                  onSelect={() => {
                    setTheme(value)
                    closeMenu()
                  }}
                >
                  {value}
                  {theme === value && <CheckIcon className="ml-auto size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {activePage === "arcade-menu" && (
            <CommandGroup heading="games">
              <CommandItem
                value="rack it up"
                onSelect={() => closeAndNavigate("/games/rius/active")}
                asChild
              >
                <Link to="/games/rius/active" replace>
                  rack it up
                </Link>
              </CommandItem>
              <CommandItem
                value="back it up"
                onSelect={() => closeAndNavigate("/games/bius")}
                asChild
              >
                <Link to="/games/bius" replace>
                  back it up
                </Link>
              </CommandItem>
              <CommandItem
                value="stack it up"
                onSelect={() => closeAndNavigate("/games/sius")}
                asChild
              >
                <Link to="/games/sius" replace>
                  stack it up
                </Link>
              </CommandItem>
              <CommandItem
                value="arcade"
                onSelect={() => closeAndNavigate("/games/arcade")}
                asChild
              >
                <Link to="/games/arcade" replace>
                  arcade
                </Link>
              </CommandItem>
            </CommandGroup>
          )}

          {activePage === "search-users" && (
            <Suspense
              fallback={
                <div className="text-muted-foreground py-3 text-center text-sm">
                  loading users...
                </div>
              }
            >
              <SearchUsersPage
                query={input}
                scrollRef={listRef}
                onSelectUser={(userId) => {
                  closeAndNavigate(`/users/${userId}`)
                }}
              />
            </Suspense>
          )}

          {activePage === "search-vault" && (
            <Suspense
              fallback={
                <div className="text-muted-foreground py-3 text-center text-sm">
                  loading videos...
                </div>
              }
            >
              <SearchVaultPage
                query={input}
                scrollRef={listRef}
                onSelectVideo={(videoId) => {
                  closeAndNavigate(`/vault/${videoId}`)
                }}
              />
            </Suspense>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}

function SearchUsersPage({
  query,
  scrollRef,
  onSelectUser,
}: {
  query: string
  scrollRef: React.RefObject<HTMLDivElement | null>
  onSelectUser: (userId: number) => void
}) {
  const { data: users } = useSuspenseQuery(usersApi.all.queryOptions())

  const searchReadyUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        searchKey: user.name.toLowerCase(),
      })),
    [users],
  )

  const fzf = useFzf([searchReadyUsers, { selector: (user) => user.searchKey }])

  const filteredUsers = fzf.find(query.toLowerCase())

  const shouldVirtualize = filteredUsers.length > VIRTUALIZE_THRESHOLD

  const virtualizer = useVirtualizer({
    count: filteredUsers.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
    enabled: shouldVirtualize,
  })

  if (filteredUsers.length === 0) {
    return (
      <p className="text-muted-foreground py-3 text-center text-sm">
        no users found.
      </p>
    )
  }

  // Non-virtualized rendering for small lists
  if (!shouldVirtualize) {
    return (
      <CommandGroup heading="users">
        {filteredUsers.map(({ item: user }) => (
          <CommandItem
            key={user.id}
            value={`user-${user.id}-${user.name}`}
            onSelect={() => onSelectUser(user.id)}
          >
            {user.name}
          </CommandItem>
        ))}
      </CommandGroup>
    )
  }

  // Virtualized rendering for large lists
  return (
    <div className="text-foreground overflow-hidden px-2 py-1">
      <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
        users
      </div>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const user = filteredUsers[virtualItem.index]?.item
          if (!user) return null
          return (
            <CommandItem
              key={user.id}
              value={`user-${user.id}-${user.name}`}
              onSelect={() => onSelectUser(user.id)}
              style={{
                position: "absolute",
                top: virtualItem.start,
                left: 0,
                right: 0,
              }}
            >
              {user.name}
            </CommandItem>
          )
        })}
      </div>
    </div>
  )
}

const VIRTUALIZE_THRESHOLD = 10
const ITEM_HEIGHT = 36 // Height of CommandItem in pixels

function SearchVaultPage({
  query,
  scrollRef,
  onSelectVideo,
}: {
  query: string
  scrollRef: React.RefObject<HTMLDivElement | null>
  onSelectVideo: (videoId: number) => void
}) {
  const { data: videos } = useSuspenseQuery(utv.all.queryOptions())

  const searchReadyVideos = useMemo(
    () =>
      videos.map((video) => ({
        ...video,
        searchKey: video.title.toLowerCase(),
      })),
    [videos],
  )

  const fzf = useFzf([
    searchReadyVideos,
    { selector: (video) => video.searchKey },
  ])

  const filteredVideos = fzf.find(query.toLowerCase())

  const shouldVirtualize = filteredVideos.length > VIRTUALIZE_THRESHOLD

  const virtualizer = useVirtualizer({
    count: filteredVideos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
    enabled: shouldVirtualize,
  })

  if (filteredVideos.length === 0) {
    return (
      <p className="text-muted-foreground py-3 text-center text-sm">
        no videos found.
      </p>
    )
  }

  // Non-virtualized rendering for small lists
  if (!shouldVirtualize) {
    return (
      <CommandGroup heading="vault">
        {filteredVideos.map(({ item: video }) => (
          <CommandItem
            key={video.id}
            value={`video-${video.id}-${video.title}`}
            onSelect={() => onSelectVideo(video.id)}
          >
            {video.title}
          </CommandItem>
        ))}
      </CommandGroup>
    )
  }

  // Virtualized rendering for large lists
  return (
    <div className="text-foreground overflow-hidden px-2 py-1">
      <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
        vault
      </div>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const video = filteredVideos[virtualItem.index]?.item
          if (!video) return null
          return (
            <CommandItem
              key={video.id}
              value={`video-${video.id}-${video.title}`}
              onSelect={() => onSelectVideo(video.id)}
              style={{
                position: "absolute",
                top: virtualItem.start,
                left: 0,
                right: 0,
              }}
            >
              {video.title}
            </CommandItem>
          )
        })}
      </div>
    </div>
  )
}
