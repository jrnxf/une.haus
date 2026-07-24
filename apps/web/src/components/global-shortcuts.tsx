import { useHotkey } from "@tanstack/react-hotkeys"
import { useEffect, useRef } from "react"

import { useSidebar } from "~/components/ui/sidebar"
import { usePeripherals } from "~/hooks/use-peripherals"
import { useTheme } from "~/lib/theme/context"

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
  const { isMobile, toggleSidebar, setOpen: setSidebarOpen } = useSidebar()
  const [navOpen, setNavOpen, dismissNav] = usePeripherals("nav")
  const { resolvedTheme, setTheme } = useTheme()

  // When crossing to desktop with the drawer open, hand off to the sidebar
  const prevIsMobile = useRef(isMobile)
  useEffect(() => {
    if (prevIsMobile.current && !isMobile && navOpen) {
      dismissNav()
      setSidebarOpen(true)
    }
    prevIsMobile.current = isMobile
  }, [isMobile, navOpen, dismissNav, setSidebarOpen])

  useHotkey(
    "Mod+B",
    (event) => {
      event.preventDefault()
      if (isMobile) {
        setNavOpen(!navOpen)
      } else {
        toggleSidebar()
      }
    },
    { ignoreInputs: true },
  )

  // Cmd/Ctrl+Shift+D toggles the theme. Registered as a raw keydown listener
  // (not useHotkey) with explicit typing-target guards so the shortcut is
  // statically verifiable by audit tooling.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return
      if (event.key.toLowerCase() !== "d") return
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [resolvedTheme, setTheme])

  return null
}
