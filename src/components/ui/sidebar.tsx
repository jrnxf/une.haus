import * as React from "react"

import { TooltipProvider } from "~/components/ui/tooltip"
import { useIsTablet } from "~/hooks/use-mobile"
import { session } from "~/lib/session/index"
import { cn } from "~/lib/utils"

const SIDEBAR_WIDTH = "12rem"
const SIDEBAR_WIDTH_ICON = "3rem"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
}) {
  const isMobile = useIsTablet()
  const [open, setOpenState] = React.useState(defaultOpen)

  // Close sidebar when crossing to mobile
  const prevIsMobile = React.useRef(isMobile)
  React.useEffect(() => {
    if (isMobile && !prevIsMobile.current) {
      setOpenState(false)
    }
    prevIsMobile.current = isMobile
  }, [isMobile])

  const setOpen = React.useCallback((nextOpen: boolean) => {
    setOpenState(nextOpen)
    // Persist state to session
    session.sidebar.set.fn({ data: nextOpen })
  }, [])

  const toggleSidebar = React.useCallback(() => {
    setOpen(!open)
  }, [open, setOpen])

  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delay={300}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            "group/sidebar-wrapper flex min-h-svh w-full",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

export { SidebarProvider, useSidebar }
