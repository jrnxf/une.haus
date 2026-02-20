/**
 * Global keyboard shortcuts.
 *
 * Format:
 * - `keys`: The hotkey string for react-hotkeys-hook. Use ">" for sequences.
 * - `display`: Array of key labels for UI display (rendered as individual Kbd components)
 * - `description`: Human-readable description
 *
 * These shortcuts are disabled inside input, textarea, select, and contentEditable elements.
 */
export const SHORTCUTS = {
  toggleSidebar: {
    keys: "mod+b",
    display: ["mod", "B"],
    description: "Toggle sidebar",
  },
} as const;
