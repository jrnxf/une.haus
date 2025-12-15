import { Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import { usePeripherals } from "~/hooks/use-peripherals";
import { useLogout, useSessionUser } from "~/lib/session/hooks";
import { useTheme } from "~/lib/theme/context";

type Page = "games" | "posts" | "root" | "theme" | "users" | "vault";

export function CommandMenu() {
  const sessionUser = useSessionUser();
  const isAuthenticated = Boolean(sessionUser);

  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const logout = useLogout();

  const [pages, setPages] = React.useState<Page[]>(["root"]);
  const [input, setInput] = React.useState("");
  const activePage = pages.at(-1);

  const [open, setOpen] = usePeripherals("search");

  // Keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "k" &&
        (event.metaKey || event.ctrlKey) &&
        !event.repeat
      ) {
        event.preventDefault();
        setOpen(!open);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  const pushPage = (page: Page) => {
    setPages((pages) => [...pages, page]);
    setInput("");
  };

  const popPage = () => {
    setPages((pages) => pages.slice(0, -1));
    setInput("");
  };

  const reset = () => {
    setPages(["root"]);
    setInput("");
  };

  return (
    <CommandDialog
      onCloseAutoFocus={reset}
      onOpenChange={setOpen}
      open={open}
      title="Command Menu"
      showCloseButton={false}
    >
      <CommandInput
        onKeyDown={(e) => {
          if (e.key === "Backspace" && input === "" && pages.length > 1) {
            popPage();
          }
        }}
        onValueChange={setInput}
        placeholder="Search for anything..."
        value={input}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {activePage === "root" && (
          <>
            <CommandGroup heading="Pages">
              <CommandItem
                value="/games/rius/active"
                onSelect={() =>
                  navigate({ to: "/games/rius/active", replace: true })
                }
                asChild
              >
                <Link to="/games/rius/active" replace>
                  Games
                </Link>
              </CommandItem>
              <CommandItem
                value="/users"
                onSelect={() => navigate({ to: "/users", replace: true })}
                asChild
              >
                <Link to="/users" replace>
                  Users
                </Link>
              </CommandItem>
              <CommandItem
                value="/posts"
                onSelect={() => navigate({ to: "/posts", replace: true })}
                asChild
              >
                <Link to="/posts" replace>
                  Posts
                </Link>
              </CommandItem>
              <CommandItem
                value="/chat"
                onSelect={() => navigate({ to: "/chat", replace: true })}
                asChild
              >
                <Link to="/chat" replace>
                  Chat
                </Link>
              </CommandItem>
              <CommandItem
                value="/vault"
                id="vault"
                onSelect={() => navigate({ to: "/vault", replace: true })}
                asChild
              >
                <Link to="/vault" replace>
                  Vault
                </Link>
              </CommandItem>
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
                    onSelect={() => navigate({ to: "/auth/me", replace: true })}
                    asChild
                  >
                    <Link replace to="/auth/me">
                      Profile
                    </Link>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      logout({});
                      setOpen(false);
                    }}
                  >
                    Logout
                  </CommandItem>
                </>
              ) : (
                <>
                  {/* <CommandItem onSelect={() => pushPage("theme")}>
                    Theme
                  </CommandItem> */}
                  <CommandItem
                    value="/auth/code/send"
                    onSelect={() =>
                      navigate({ to: "/auth/code/send", replace: true })
                    }
                    asChild
                  >
                    <Link replace to="/auth/code/send">
                      Login
                    </Link>
                  </CommandItem>
                </>
              )}
            </CommandGroup>
          </>
        )}

        {activePage === "theme" && (
          <CommandGroup heading="Theme">
            <CommandItem
              onSelect={() => {
                setTheme("light");
                setOpen(false);
              }}
            >
              Light
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setTheme("dark");
                setOpen(false);
              }}
            >
              Dark
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setTheme("system");
                setOpen(false);
              }}
            >
              System
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
