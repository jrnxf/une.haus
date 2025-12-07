import { useNavigate } from "@tanstack/react-router";
import * as React from "react";

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

  const { setTheme } = useTheme();

  const navigate = useNavigate();

  const logout = useLogout();

  const [open, setOpen] = React.useState(false);
  const [pages, setPages] = React.useState<Page[]>(["root"]);

  const [input, setInput] = React.useState("");
  const activePage = pages.at(-1);

  useEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      setOpen((open) => !open);
    }
  });

  const goTo = (route: string) => {
    navigate({ to: route });
    setOpen(false);
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
              <CommandItem onSelect={() => goTo("/games/rius/active")}>
                Games
              </CommandItem>
              <CommandItem onSelect={() => goTo("/users")}>Users</CommandItem>
              <CommandItem onSelect={() => goTo("/posts")}>Posts</CommandItem>
              <CommandItem onSelect={() => goTo("/chat")}>Chat</CommandItem>
              <CommandItem onSelect={() => goTo("/vault")}>Vault</CommandItem>
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
                  <CommandItem onSelect={() => goTo("/auth/me")}>
                    Profile
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
                  <CommandItem onSelect={() => goTo("/auth/code/send")}>
                    Login
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
