import { useHotkey } from "@tanstack/react-hotkeys"
import { useEffect, useRef } from "react"

import { useSidebar } from "~/components/ui/sidebar"
import { usePeripherals } from "~/hooks/use-peripherals"

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

  return null
}
