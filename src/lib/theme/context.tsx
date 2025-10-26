// https://gist.github.com/WellDone2094/16107a2a9476b28a5b394bee3fa1b8a3 (adapted)

import { createIsomorphicFn } from "@tanstack/react-start";
import React from "react";

import dedent from "dedent";
import { z } from "zod";

import { invariant } from "~/lib/invariant";
import { injectThemeScript } from "~/lib/theme/inject";

// css to append to a body during the theme transition to prevent cascading animation glitches
const DISABLE_ANIMATION_CSS = dedent`
  *,
  *::before,
  *::after {
    -webkit-transition: none !important;
    -moz-transition: none !important;
    -o-transition: none !important;
    -ms-transition: none !important;
    transition: none !important;
  }
`;

export const themeSchema = z.enum(["light", "dark", "system"]);

export type Theme = z.infer<typeof themeSchema>;

export const resolvedThemeSchema = z.enum(["light", "dark"]);

export type ResolvedTheme = z.infer<typeof resolvedThemeSchema>;

export type UseThemeProps = {
  /** Active theme name */
  theme: Theme;
  /** Resolved theme name */
  resolvedTheme?: ResolvedTheme;
  /** Update the theme */
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
};

const getSystemTheme = createIsomorphicFn().client(
  (evt?: MediaQueryList | MediaQueryListEvent) => {
    const event = evt ?? globalThis.matchMedia(MEDIA);
    const isDark = event.matches;
    const systemTheme = isDark ? "dark" : "light";
    return systemTheme;
  },
);

const MEDIA = "(prefers-color-scheme: dark)";
const DEFAULT_THEME = "system";
const STORAGE_KEY = "haus.theme";

const IS_SERVER = typeof globalThis.window === "undefined";

const ThemeContext = React.createContext<UseThemeProps>(
  undefined as unknown as UseThemeProps,
);

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  invariant(context, "useTheme must be used within ThemeProvider");
  return context;
};

export const ThemeProvider = (props: {
  children: React.ReactNode;
}): React.ReactNode => {
  const context = React.useContext(ThemeContext);

  // Ignore nested context providers, just passthrough children
  if (context) return props.children;
  return <Theme {...props} />;
};

const themes = new Set(["light", "dark", "system"]);

const Theme = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = React.useState(() => getTheme());
  const [systemTheme, setSystemTheme] = React.useState(() =>
    theme === "system" ? getSystemTheme() : theme,
  );

  const applyTheme = React.useCallback((theme: Theme | undefined) => {
    let resolved = theme;
    if (!resolved) return;

    // If theme is system, resolve it before setting theme
    if (theme === "system") {
      resolved = getSystemTheme();
    }

    const name = resolved;
    const docEl = document.documentElement;

    docEl.classList.remove("light", "dark");
    if (name) {
      docEl.classList.add(name);
    }

    const fallback = themes.has(DEFAULT_THEME) ? DEFAULT_THEME : "dark";
    const colorScheme = resolved && themes.has(resolved) ? resolved : fallback;
    docEl.style.colorScheme = colorScheme;

    disableAnimationWithCleanupFn()();
  }, []);

  const setTheme = React.useCallback(
    (value: unknown) => {
      const newTheme = typeof value === "function" ? value(theme) : value;
      setThemeState(newTheme);

      // Save to storage
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch {
        // Unsupported
      }
    },
    [theme],
  );

  // Always listen to System preference
  React.useEffect(() => {
    const handleMediaQuery = (evt: MediaQueryListEvent | MediaQueryList) => {
      const resolved = getSystemTheme(evt);
      setSystemTheme(resolved);

      if (theme === "system") {
        applyTheme("system");
      }
    };

    const media = globalThis.matchMedia(MEDIA);
    // Intentionally use deprecated listener methods to support iOS & old browsers
    media.addListener(handleMediaQuery);
    handleMediaQuery(media);

    return () => media.removeListener(handleMediaQuery);
  }, [applyTheme, theme]);

  // localStorage event handling, allow to sync theme changes between tabs
  React.useEffect(() => {
    const handleStorage = (evt: StorageEvent) => {
      if (evt.key !== STORAGE_KEY) {
        return;
      }

      // If default theme set, use it if localstorage === null (happens on local
      // storage manual deletion)
      const theme = evt.newValue || DEFAULT_THEME;
      setTheme(theme);
    };

    globalThis.addEventListener("storage", handleStorage);
    return () => globalThis.removeEventListener("storage", handleStorage);
  }, [setTheme]);

  React.useEffect(() => {
    applyTheme(theme);
  }, [applyTheme, theme]);

  const providerValue = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme: theme === "system" ? systemTheme : theme,
    }),
    [theme, setTheme, systemTheme],
  );

  return (
    <ThemeContext.Provider value={providerValue}>
      <ThemeScript />
      {children}
    </ThemeContext.Provider>
  );
};

const ThemeScript = React.memo(() => {
  return (
    <script
      suppressHydrationWarning
      // inject script before hydration
      dangerouslySetInnerHTML={{
        __html: `(${injectThemeScript.toString()})()`,
      }}
    />
  );
});

// Helpers
const getTheme = () => {
  if (IS_SERVER) {
    return DEFAULT_THEME;
  }
  try {
    return themeSchema.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
};

const disableAnimationWithCleanupFn = () => {
  const css = document.createElement("style");
  css.append(document.createTextNode(DISABLE_ANIMATION_CSS));
  document.head.append(css);

  return () => {
    requestAnimationFrame(() => {
      css.remove();
    });
  };
};
