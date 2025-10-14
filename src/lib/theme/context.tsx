// https://gist.github.com/WellDone2094/16107a2a9476b28a5b394bee3fa1b8a3

/*
  This file is adapted from next-themes to work with tanstack start. next-themes
  can be found at https://github.com/pacocoursey/next-themes under the MIT
  license.
*/
import React from "react";

type ValueObject = Record<string, string>;

export type UseThemeProps = {
  /** List of all available theme names */
  themes: string[];
  /** Forced theme name for the current page */
  forcedTheme?: string | undefined;
  /** Update the theme */
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  /** Active theme name */
  theme?: string | undefined;
  /** If enableSystem is true, returns the System theme preference ("dark" or
   * "light"), regardless what the active theme is */
  systemTheme?: "dark" | "light" | undefined;
};

export type Attribute = `data-${string}` | "class";

export type ThemeProviderProps = {
  /** List of all available theme names */
  themes?: string[] | undefined;
  /** Forced theme name for the current page */
  forcedTheme?: string | undefined;
  /** Whether to switch between dark and light themes based on
   * prefers-color-scheme */
  enableSystem?: boolean | undefined;
  /** Disable all CSS transitions when switching themes */
  disableTransitionOnChange?: boolean | undefined;
  /** Whether to indicate to browsers which color scheme is used (dark or light)
   * for built-in UI like inputs and buttons */
  enableColorScheme?: boolean | undefined;
  /** Key used to store theme setting in localStorage */
  storageKey?: string | undefined;
  /** Default theme name (for v0.0.12 and lower the default was light). If
   * `enableSystem` is false, the default theme is light */
  defaultTheme?: string | undefined;
  /** HTML attribute modified based on the active theme. Accepts `class`,
   * `data-*` (meaning any data attribute, `data-mode`, `data-color`, etc.), or
   * an array which could include both */
  attribute?: Attribute | Attribute[] | undefined;
  /** Mapping of theme name to HTML attribute value. Object where key is the
   * theme name and value is the attribute value */
  value?: ValueObject | undefined;
  /** Nonce string to pass to the inline script for CSP headers */
  nonce?: string | undefined;

  children: React.ReactNode;
};

const colorSchemes = new Set(["light", "dark"]);
const MEDIA = "(prefers-color-scheme: dark)";
const isServer = typeof globalThis.window === "undefined";
const ThemeContext = React.createContext<UseThemeProps | undefined>(undefined);
const defaultContext: UseThemeProps = { setTheme: (_) => {}, themes: [] };

export const useTheme = () => React.useContext(ThemeContext) ?? defaultContext;

export const ThemeProvider = (props: ThemeProviderProps): React.ReactNode => {
  const context = React.useContext(ThemeContext);

  // Ignore nested context providers, just passthrough children
  if (context) return props.children;
  return <Theme {...props} />;
};

const defaultThemes = ["light", "dark"];

const Theme = ({
  forcedTheme,
  disableTransitionOnChange = false,
  enableSystem = true,
  enableColorScheme = true,
  storageKey = "theme",
  themes = defaultThemes,
  defaultTheme = enableSystem ? "system" : "light",
  attribute = "data-theme",
  value,
  children,
  nonce,
}: ThemeProviderProps) => {
  const [theme, setThemeState] = React.useState(() =>
    getTheme(storageKey, defaultTheme),
  );
  const attrs = value ? Object.values(value) : themes;

  const applyTheme = React.useCallback((theme: string | undefined) => {
    let resolved = theme;
    if (!resolved) return;

    // If theme is system, resolve it before setting theme
    if (theme === "system" && enableSystem) {
      resolved = getSystemTheme();
    }

    const name = value ? value[resolved] : resolved;
    const enable = disableTransitionOnChange ? disableAnimation() : null;
    const docEl = document.documentElement;

    const handleAttribute = (attr: Attribute) => {
      if (attr === "class") {
        docEl.classList.remove(...attrs);
        if (name) docEl.classList.add(name);
      } else if (attr.startsWith("data-")) {
        if (name) {
          docEl.setAttribute(attr, name);
        } else {
          docEl.removeAttribute(attr);
        }
      }
    };

    for (const attr of [attribute].flat()) {
      handleAttribute(attr);
    }

    if (enableColorScheme) {
      const fallback = colorSchemes.has(defaultTheme) ? defaultTheme : "dark";
      const colorScheme = colorSchemes.has(resolved) ? resolved : fallback;
      docEl.style.colorScheme = colorScheme;
    }

    enable?.();
  }, []);

  const setTheme = React.useCallback(
    (value: unknown) => {
      const newTheme = typeof value === "function" ? value(theme) : value;
      setThemeState(newTheme);

      // Save to storage
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Unsupported
      }
    },
    [theme],
  );

  const handleMediaQuery = React.useCallback(() => {
    if (theme === "system" && enableSystem && !forcedTheme) {
      applyTheme("system");
    }
  }, [theme, forcedTheme]);

  // Always listen to System preference
  React.useEffect(() => {
    const media = globalThis.matchMedia(MEDIA);

    // Intentionally use deprecated listener methods to support iOS & old
    // browsers
    media.addListener(handleMediaQuery);
    // @ts-expect-error - intentional
    handleMediaQuery(media);

    return () => media.removeListener(handleMediaQuery);
  }, [handleMediaQuery]);

  // localStorage event handling, allow to sync theme changes between tabs
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) {
        return;
      }

      // If default theme set, use it if localstorage === null (happens on local
      // storage manual deletion)
      const theme = e.newValue || defaultTheme;
      setTheme(theme);
    };

    globalThis.addEventListener("storage", handleStorage);
    return () => globalThis.removeEventListener("storage", handleStorage);
  }, [setTheme]);

  React.useEffect(() => {
    applyTheme(forcedTheme ?? theme);
  }, [forcedTheme, theme]);

  const providerValue = React.useMemo(
    () => ({
      theme,
      setTheme,
      forcedTheme,
      themes: enableSystem ? [...themes, "system"] : themes,
    }),
    [theme, setTheme, forcedTheme, enableSystem, themes],
  );

  return (
    <ThemeContext.Provider value={providerValue}>
      <ThemeScript
        {...{
          forcedTheme,
          storageKey,
          attribute,
          enableSystem,
          enableColorScheme,
          defaultTheme,
          value,
          themes,
          nonce,
        }}
      />
      {children}
    </ThemeContext.Provider>
  );
};

const ThemeScript = React.memo(
  ({
    forcedTheme,
    storageKey,
    attribute,
    enableSystem,
    enableColorScheme,
    defaultTheme,
    value,
    themes,
    nonce,
  }: Omit<ThemeProviderProps, "children"> & { defaultTheme: string }) => {
    const scriptArgs = JSON.stringify([
      attribute,
      storageKey,
      defaultTheme,
      forcedTheme,
      themes,
      value,
      enableSystem,
      enableColorScheme,
    ]).slice(1, -1);

    return (
      <script
        suppressHydrationWarning
        nonce={typeof globalThis.window === "undefined" ? nonce : ""}
        // inject script before hydration
        dangerouslySetInnerHTML={{
          __html: `(${script.toString()})(${scriptArgs})`,
        }}
      />
      // <></>
    );
  },
);

// Helpers
const getTheme = (key: string, fallback?: string) => {
  if (isServer) return undefined;
  let theme: string | undefined;
  try {
    theme = localStorage.getItem(key) || undefined;
  } catch {
    // Unsupported
  }
  return theme || fallback;
};

const disableAnimation = () => {
  const css = document.createElement("style");
  css.append(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
    ),
  );
  document.head.append(css);

  return () => {
    // Force restyle
    (() => globalThis.getComputedStyle(document.body))();

    // Wait for next tick before removing
    setTimeout(() => {
      css.remove();
    }, 1);
  };
};

const getSystemTheme = (e?: MediaQueryList | MediaQueryListEvent) => {
  const event = e ?? globalThis.matchMedia(MEDIA);
  const isDark = event.matches;
  const systemTheme = isDark ? "dark" : "light";
  return systemTheme;
};

/*
  This file is adapted from next-themes to work with tanstack start. next-themes
  can be found at https://github.com/pacocoursey/next-themes under the MIT
  license.
*/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const script: (...args: any[]) => void = (
  attribute,
  storageKey,
  defaultTheme,
  forcedTheme,
  themes,
  value,
  enableSystem,
  enableColorScheme,
) => {
  const el = document.documentElement;
  const systemThemes = new Set(["light", "dark"]);
  const isClass = attribute === "class";
  const classes =
    isClass && value
      ? themes.map((t: string | number) => value[t] || t)
      : themes;

  function updateDOM(theme: string) {
    if (isClass) {
      el.classList.remove(...classes);
      el.classList.add(theme);
    } else {
      el.setAttribute(attribute, theme);
    }

    setColorScheme(theme);
  }

  function setColorScheme(theme: string) {
    if (enableColorScheme && systemThemes.has(theme)) {
      el.style.colorScheme = theme;
    }
  }

  // eslint-disable-next-line unicorn/consistent-function-scoping
  function getSystemTheme() {
    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  if (forcedTheme) {
    updateDOM(forcedTheme);
  } else {
    try {
      const themeName = localStorage.getItem(storageKey) || defaultTheme;
      const isSystem = enableSystem && themeName === "system";
      const theme = isSystem ? getSystemTheme() : themeName;
      updateDOM(theme);
    } catch {
      //
    }
  }
};
