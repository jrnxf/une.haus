import { useMutation } from "@tanstack/react-query";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";

import { rootRouteId } from "@tanstack/router-core";

import { invariant } from "~/lib/invariant";
import { session as sessionApi } from "~/lib/session";
import { cn } from "~/lib/utils";

export type ResolvedTheme = "dark" | "light";

export type Theme = ResolvedTheme | "system";

export type ThemeContext = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = React.createContext<ThemeContext>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  const context = React.useContext(ThemeContext);
  invariant(context, "useTheme must be used within ThemeProvider");
  return context;
}

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function checkMediaQuery() {
  if ("matchMedia" in globalThis) {
    // ssr safe
    const systemIsDarkMode = globalThis.matchMedia(MEDIA_QUERY).matches;

    return systemIsDarkMode ? "dark" : "light";
  }
}

export function ThemeProvider(props: { children: React.ReactNode }) {
  const { session } = useRouteContext({ from: rootRouteId });
  const [systemTheme, setSystemTheme] = useState(
    checkMediaQuery() ?? session.theme === "system",
  );

  const router = useRouter();

  const theme = session.theme;

  const setSessionTheme = useMutation({
    mutationFn: sessionApi.theme.set.fn,
    onSuccess: () => {
      router.invalidate();
    },
  });

  // subscribe to changes in the users light/dark mode system preference
  useEffect(() => {
    globalThis.matchMedia(MEDIA_QUERY).addEventListener("change", () => {
      setSystemTheme(checkMediaQuery());
    });
  }, [theme]);

  const resolvedTheme =
    theme === "light" || theme === "dark" ? theme : systemTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme: (theme) => {
          setSessionTheme.mutate({ data: theme });
        },
      }}
    >
      <div className={cn(resolvedTheme === "dark" && "dark")}>
        {props.children}
      </div>
    </ThemeContext.Provider>
  );
}
