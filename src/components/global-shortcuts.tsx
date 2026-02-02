import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";

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
 */
export function GlobalShortcuts() {
  const { theme, setTheme } = useTheme();

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

  return null;
}
