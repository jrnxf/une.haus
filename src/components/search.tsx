import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Suspense, useMemo, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "~/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Kbd,
} from "~/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { usePeripherals } from "~/hooks/use-peripherals";
import { useLogout, useSessionUser } from "~/lib/session/hooks";
import { useTheme } from "~/lib/theme/context";
import { users as usersApi } from "~/lib/users";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

type Page =
  | "games"
  | "games-menu"
  | "posts"
  | "root"
  | "search-users"
  | "theme"
  | "tricks"
  | "users"
  | "vault";

type SecondaryAction = {
  id: string;
  label: string;
  shortcut?: { key: string; meta?: boolean; shift?: boolean };
  hotkey?: string; // e.g., "mod+s"
  onAction: () => void;
};

type CommandItemConfig = {
  id: string;
  label: string;
  value: string;
  primaryAction: {
    label: string;
    onAction: () => void;
  };
  secondaryActions?: SecondaryAction[];
};

export function Search() {
  const sessionUser = useSessionUser();
  const isAuthenticated = Boolean(sessionUser);

  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const logout = useLogout();

  const [pages, setPages] = React.useState<Page[]>(["root"]);
  const [input, setInput] = React.useState("");
  const [selectedValue, setSelectedValue] = React.useState<string>("");
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const activePage = pages.at(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = usePeripherals("search");

  // Keyboard shortcut to open menu
  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      setOpen(!open);
    },
    { enableOnFormTags: true },
    [open, setOpen],
  );

  const pushPage = (page: Page) => {
    setPages((pages) => [...pages, page]);
    setInput("");
    setSelectedValue("");
  };

  const popPage = () => {
    setPages((pages) => pages.slice(0, -1));
    setInput("");
    setSelectedValue("");
  };

  const reset = () => {
    setPages(["root"]);
    setInput("");
    setSelectedValue("");
    setActionsOpen(false);
  };

  // Close the menu without triggering history.back()
  // Clear the 'p' param directly instead of calling setOpen
  const closeMenu = () => {
    navigate({
      search: (prev: Record<string, unknown>) => {
        const { p, ...rest } = prev;
        return rest;
      },
      replace: true,
    } as Parameters<typeof navigate>[0]);
  };

  // Navigate and close the menu without triggering history.back()
  const closeAndNavigate = (to: string) => {
    navigate({
      to,
      replace: true,
      search: (prev: Record<string, unknown>) => {
        const { p, ...rest } = prev;
        return rest;
      },
    } as Parameters<typeof navigate>[0]);
  };

  // Define command items with their actions
  const commandItems: CommandItemConfig[] = [
    {
      id: "games",
      label: "Games",
      value: "/games",
      primaryAction: {
        label: "Open",
        onAction: () => closeAndNavigate("/games"),
      },
      secondaryActions: [
        {
          id: "games-menu",
          label: "Choose Game",
          shortcut: { key: "↵", meta: true },
          hotkey: "mod+enter",
          onAction: () => pushPage("games-menu"),
        },
      ],
    },
    {
      id: "users",
      label: "Users",
      value: "/users",
      primaryAction: {
        label: "Open",
        onAction: () => closeAndNavigate("/users"),
      },
      secondaryActions: [
        {
          id: "search-users",
          label: "Search Users",
          shortcut: { key: "↵", meta: true },
          hotkey: "mod+enter",
          onAction: () => pushPage("search-users"),
        },
      ],
    },
    {
      id: "posts",
      label: "Posts",
      value: "/posts",
      primaryAction: {
        label: "Open",
        onAction: () => closeAndNavigate("/posts"),
      },
    },
    {
      id: "chat",
      label: "Chat",
      value: "/chat",
      primaryAction: {
        label: "Open",
        onAction: () => closeAndNavigate("/chat"),
      },
    },
    {
      id: "vault",
      label: "Vault",
      value: "/vault",
      primaryAction: {
        label: "Open",
        onAction: () => closeAndNavigate("/vault"),
      },
    },
    {
      id: "tricks",
      label: "Tricks",
      value: "/tricks",
      primaryAction: {
        label: "Open",
        onAction: () => closeAndNavigate("/tricks"),
      },
    },
    {
      id: "stats",
      label: "Stats",
      value: "/stats",
      primaryAction: {
        label: "Open",
        onAction: () => closeAndNavigate("/stats"),
      },
    },
    {
      id: "notifications",
      label: "Notifications",
      value: "/notifications",
      primaryAction: {
        label: "Open",
        onAction: () => closeAndNavigate("/notifications"),
      },
    },
    {
      id: "feedback",
      label: "Feedback",
      value: "/feedback",
      primaryAction: {
        label: "Open",
        onAction: () => closeAndNavigate("/feedback"),
      },
    },
  ];

  // Map selected value to item - cmdk lowercases values for matching
  const selectedItem = commandItems.find(
    (item) => item.value.toLowerCase() === selectedValue.toLowerCase(),
  );

  const hasSecondaryActions =
    selectedItem?.secondaryActions && selectedItem.secondaryActions.length > 0;

  // Cmd+B to toggle actions dropdown
  useHotkeys(
    "mod+b",
    (e) => {
      if (!open || activePage !== "root" || !hasSecondaryActions) return;
      e.preventDefault();
      setActionsOpen((prev) => !prev);
    },
    {
      enableOnFormTags: true,
      enabled: open && activePage === "root" && hasSecondaryActions,
    },
    [open, activePage, hasSecondaryActions],
  );

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.userAgent);
  const metaSymbol = isMac ? "⌘" : "Ctrl";

  const formatShortcut = (shortcut: SecondaryAction["shortcut"]) => {
    if (!shortcut) return null;
    const parts: string[] = [];
    if (shortcut.meta) parts.push(metaSymbol);
    if (shortcut.shift) parts.push("⇧");
    parts.push(shortcut.key.toUpperCase());
    return parts;
  };

  const handleDropdownSelect = (action: SecondaryAction) => {
    action.onAction();
    setActionsOpen(false);
    // Return focus to input after selecting from dropdown
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const getPrimaryActionLabel = () => {
    if (activePage === "root" && selectedItem) {
      return selectedItem.primaryAction.label;
    }
    if (activePage === "search-users") {
      return "Go to User";
    }
    if (activePage === "theme") {
      return "Set Theme";
    }
    if (activePage === "games-menu") {
      return "Open Game";
    }
    return "Select";
  };

  const footer = (
    <div className="bg-popover flex w-full items-center justify-end gap-1 border-t px-2 py-1.5">
      {/* Back action for sub-pages */}
      {pages.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={popPage}
          className="mr-auto gap-1.5"
        >
          <span>Back</span>
          <Kbd>⌫</Kbd>
        </Button>
      )}

      {/* Primary action */}
      <Button variant="ghost" size="sm" className="gap-1.5" disabled>
        <span>{getPrimaryActionLabel()}</span>
        <Kbd>↵</Kbd>
      </Button>

      {/* Actions dropdown */}
      {activePage === "root" && hasSecondaryActions && (
        <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <span>Actions</span>
              <Kbd>{metaSymbol}</Kbd>
              <Kbd>B</Kbd>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-[200px]">
            {selectedItem?.secondaryActions?.map((action) => {
              const shortcutParts = formatShortcut(action.shortcut);
              return (
                <DropdownMenuItem
                  key={action.id}
                  onSelect={() => handleDropdownSelect(action)}
                >
                  {action.label}
                  {shortcutParts && (
                    <DropdownMenuShortcut className="flex items-center gap-0.5">
                      {shortcutParts.map((part, i) => (
                        <Kbd key={i}>{part}</Kbd>
                      ))}
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <CommandDialog
      onCloseAutoFocus={reset}
      onOpenChange={setOpen}
      open={open}
      title="Command Menu"
      showCloseButton={false}
      footer={footer}
      value={selectedValue}
      onValueChange={setSelectedValue}
      shouldFilter={activePage !== "search-users"}
    >
      <CommandInput
        ref={inputRef}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && input === "" && pages.length > 1) {
            popPage();
          }
          // Handle meta+enter for secondary actions before cmdk processes it
          if (
            e.key === "Enter" &&
            (e.metaKey || e.ctrlKey) &&
            activePage === "root" &&
            selectedItem
          ) {
            const enterAction = selectedItem.secondaryActions?.find(
              (a) => a.hotkey === "mod+enter",
            );
            if (enterAction) {
              e.preventDefault();
              e.stopPropagation();
              enterAction.onAction();
              setActionsOpen(false);
            }
          }
        }}
        onValueChange={(value) => {
          setInput(value);
          requestAnimationFrame(() => {
            listRef.current?.scrollTo({ top: 0 });
          });
        }}
        placeholder={
          activePage === "search-users"
            ? "Search users..."
            : "Search for anything..."
        }
        value={input}
      />
      <CommandList ref={listRef}>
        {activePage !== "search-users" && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {activePage === "root" && (
          <>
            <CommandGroup heading="Pages">
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
            <CommandGroup heading="Settings">
              <CommandItem
                onSelect={() => {
                  pushPage("theme");
                }}
              >
                Theme
              </CommandItem>
              {isAuthenticated ? (
                <>
                  <CommandItem
                    value="/auth/me"
                    onSelect={() => closeAndNavigate("/auth/me")}
                    asChild
                  >
                    <Link replace to="/auth/me">
                      Profile
                    </Link>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      logout({});
                      closeMenu();
                    }}
                  >
                    Logout
                  </CommandItem>
                </>
              ) : (
                <CommandItem
                  value="/auth/code/send"
                  onSelect={() => closeAndNavigate("/auth/code/send")}
                  asChild
                >
                  <Link replace to="/auth/code/send">
                    Login
                  </Link>
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}

        {activePage === "theme" && (
          <CommandGroup heading="Theme">
            <CommandItem
              onSelect={() => {
                setTheme("light");
                closeMenu();
              }}
            >
              Light
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setTheme("dark");
                closeMenu();
              }}
            >
              Dark
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setTheme("system");
                closeMenu();
              }}
            >
              System
            </CommandItem>
          </CommandGroup>
        )}

        {activePage === "games-menu" && (
          <CommandGroup heading="Games">
            <CommandItem
              value="/games/rius/active"
              onSelect={() => closeAndNavigate("/games/rius/active")}
              asChild
            >
              <Link to="/games/rius/active" replace>
                Rack It Up
              </Link>
            </CommandItem>
            <CommandItem
              value="/games/bius"
              onSelect={() => closeAndNavigate("/games/bius")}
              asChild
            >
              <Link to="/games/bius" replace>
                Back It Up
              </Link>
            </CommandItem>
            <CommandItem
              value="/games/sius"
              onSelect={() => closeAndNavigate("/games/sius")}
              asChild
            >
              <Link to="/games/sius" replace>
                Stack It Up
              </Link>
            </CommandItem>
          </CommandGroup>
        )}

        {activePage === "search-users" && (
          <Suspense
            fallback={
              <div className="text-muted-foreground py-3 text-center text-sm">
                Loading users...
              </div>
            }
          >
            <SearchUsersPage
              query={input}
              onSelectUser={(userId) => {
                closeAndNavigate(`/users/${userId}`);
              }}
            />
          </Suspense>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function SearchUsersPage({
  query,
  onSelectUser,
}: {
  query: string;
  onSelectUser: (userId: number) => void;
}) {
  const { data: users } = useSuspenseQuery(usersApi.all.queryOptions());

  const searchReadyUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        searchKey: user.name.toLowerCase(),
      })),
    [users],
  );

  const fzf = useFzf([
    searchReadyUsers,
    { selector: (user) => user.searchKey },
  ]);

  const filteredUsers = fzf.find(query.toLowerCase());

  if (filteredUsers.length === 0) {
    return (
      <p className="text-muted-foreground py-3 text-center text-sm">
        No users found.
      </p>
    );
  }

  return (
    <CommandGroup heading="Users">
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
  );
}
