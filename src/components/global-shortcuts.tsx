import { useHotkey } from "@tanstack/react-hotkeys";
import { useHotkeys } from "react-hotkeys-hook";

import { toast } from "sonner";

import { useSidebar } from "~/components/ui/sidebar";
import { usePeripherals } from "~/hooks/use-peripherals";
import { SHORTCUTS } from "~/lib/shortcuts/constants";
import { useTheme, type Theme } from "~/lib/theme/context";

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];

/**
 * Global keyboard shortcuts that work anywhere except inside form elements.
 *
 * By default, react-hotkeys-hook disables shortcuts inside:
 * - <input>
 * - <textarea>
 * - <select>
 * - contentEditable elements
 *
 * Must be rendered inside both MobileNavProvider and SidebarProvider.
 */
export function GlobalShortcuts() {
  const { theme, setTheme } = useTheme();
  const { isMobile, toggleSidebar } = useSidebar();
  const [navOpen, setNavOpen] = usePeripherals("nav");

  useHotkeys(
    SHORTCUTS.toggleTheme.keys,
    () => {
      const currentIndex = THEME_CYCLE.indexOf(theme);
      const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
      const nextTheme = THEME_CYCLE[nextIndex];
      setTheme(nextTheme);
      toast(`${nextTheme} theme enabled`);
    },
    { sequenceTimeoutMs: 800 },
  );

  useHotkey("Mod+B", (event) => {
    event.preventDefault();
    if (isMobile) {
      setNavOpen(!navOpen);
    } else {
      toggleSidebar();
    }
  });

  return null;
}
