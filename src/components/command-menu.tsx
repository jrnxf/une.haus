import {
  Link,
  rootRouteId,
  useNavigate,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import * as React from "react";

import { useCommandState } from "cmdk";
import { useEventListener } from "usehooks-ts";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import { useLogout, useSessionUser } from "~/lib/session/hooks";
import { useTheme } from "~/lib/theme/context";

type Page = "games" | "posts" | "root" | "theme" | "users" | "vault";

export function CommandMenu() {
  const sessionUser = useSessionUser();
  const isAuthenticated = Boolean(sessionUser);

  const { search } = useSearch({ from: rootRouteId });

  const open = search === 1;

  const { setTheme } = useTheme();

  const router = useRouter();
  const navigate = useNavigate();

  const logout = useLogout();

  const [pages, setPages] = React.useState<Page[]>(["root"]);

  const [input, setInput] = React.useState("");
  const activePage = pages.at(-1);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        navigate({
          to: ".",
          search: (prev) => ({ ...prev, search: nextOpen ? 1 : undefined }),
        });
      } else {
        router.history.back();
      }
    },
    [navigate, router],
  );

  useEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setOpen(!open);
    }
  });

  const goTo = async (route: string) => {
    navigate({ to: route, replace: true });
  };

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
                onSelect={() => goTo("/games/rius/active")}
                asChild
              >
                <Link to="/games/rius/active" replace>
                  Games
                </Link>
              </CommandItem>
              <CommandItem
                value="/users"
                onSelect={() => goTo("/users")}
                asChild
              >
                <Link to="/users" replace>
                  Users
                </Link>
              </CommandItem>
              <CommandItem
                value="/posts"
                onSelect={() => goTo("/posts")}
                asChild
              >
                <Link to="/posts" replace>
                  Posts
                </Link>
              </CommandItem>
              <CommandItem value="/chat" onSelect={() => goTo("/chat")} asChild>
                <Link to="/chat" replace>
                  Chat
                </Link>
              </CommandItem>
              <CommandItem
                value="/vault"
                id="vault"
                onSelect={() => goTo("/vault")}
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
                    onSelect={() => goTo("/auth/me")}
                    asChild
                  >
                    <Link
                      replace
                      //
                      to="/auth/me"
                    >
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
                    onSelect={() => goTo("/auth/code/send")}
                    asChild
                  >
                    <Link
                      replace
                      //
                      to="/auth/code/send"
                    >
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
