import { DrawerPreview as DrawerPrimitive } from "@base-ui/react/drawer";
import { Link, useMatches } from "@tanstack/react-router";
import {
  ArrowUpIcon,
  ClipboardPenIcon,
  EarthIcon,
  GaugeIcon,
  LockIcon,
  LockOpenIcon,
  MapIcon,
  MedalIcon,
  MessagesSquareIcon,
  Send,
  ShoppingBagIcon,
  TimerIcon,
  TrafficConeIcon,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  MobileNavContext,
  useMobileNav,
} from "~/components/mobile-nav-context";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const navItems = [
  { title: "games", url: "/games", icon: MedalIcon },
  { title: "users", url: "/users", icon: EarthIcon },
  { title: "map", url: "/map", icon: MapIcon },
  { title: "posts", url: "/posts", icon: ClipboardPenIcon },
  { title: "chat", url: "/chat", icon: MessagesSquareIcon },
  { title: "stats", url: "/stats", icon: GaugeIcon },
  { title: "tricks", url: "/tricks", icon: TrafficConeIcon },
  {
    title: "vault",
    url: "/vault",
    icon: LockIcon,
    activeIcon: LockOpenIcon,
  },
  { title: "shop", url: "/shop", icon: ShoppingBagIcon },
  { title: "events", url: "/events", icon: TimerIcon },
  { title: "feedback", url: "/feedback", icon: Send },
] as const;

function NavItem({
  title,
  url,
  icon: Icon,
  activeIcon: ActiveIcon,
  isActive,
}: {
  title: string;
  url: string;
  icon: LucideIcon;
  activeIcon?: LucideIcon;
  isActive: boolean;
}) {
  const ResolvedIcon = isActive && ActiveIcon ? ActiveIcon : Icon;
  return (
    <DrawerPrimitive.Close
      render={
        <Link
          to={url}
          replace
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-3 text-base transition-colors",
            isActive
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        />
      }
    >
      <ResolvedIcon className="size-5" />
      <span>{title}</span>
    </DrawerPrimitive.Close>
  );
}

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <MobileNavContext.Provider value={() => setOpen(true)}>
      <DrawerPrimitive.Provider>
        <DrawerPrimitive.Root
          open={open}
          onOpenChange={setOpen}
          modal={false}
          swipeDirection="down"
        >
          {children}
        </DrawerPrimitive.Root>
      </DrawerPrimitive.Provider>
    </MobileNavContext.Provider>
  );
}

export function MobileNavIndentBackground({
  className,
}: {
  className?: string;
}) {
  return (
    <DrawerPrimitive.IndentBackground
      className={cn("bg-muted/50 fixed inset-0", className)}
    />
  );
}

export function MobileNavIndent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <DrawerPrimitive.Indent
      className={cn(
        "relative flex h-full flex-col overflow-hidden transition-all duration-300 ease-out data-[active]:translate-y-3 data-[active]:scale-[0.94] data-[active]:rounded-xl",
        className,
      )}
    >
      {children}
    </DrawerPrimitive.Indent>
  );
}

export function MobileNavTrigger({ className }: { className?: string }) {
  const openNav = useMobileNav();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={openNav}
      className={cn("lg:hidden", className)}
    >
      <ArrowUpIcon />
    </Button>
  );
}

export function MobileNavPopup({
  portalContainer,
}: {
  portalContainer: HTMLElement | null;
}) {
  const matches = useMatches();
  const currentPath = matches.at(-1)?.pathname ?? "/";

  return (
    <DrawerPrimitive.Portal container={portalContainer}>
      <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 bg-black opacity-[calc(0.3*(1-var(--drawer-swipe-progress)))] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-[starting-style]:opacity-0 data-[swiping]:duration-0" />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end">
        <DrawerPrimitive.Popup className="bg-background flex max-h-[85vh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] flex-col rounded-t-xl border-t transition-transform duration-200 ease-in-out outline-none data-[ending-style]:[transform:translateY(100%)] data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-[starting-style]:[transform:translateY(100%)]">
          <div
            aria-hidden
            className="bg-muted mx-auto my-4 h-1.5 w-12 rounded-full"
          />
          <DrawerPrimitive.Content>
            <nav className="flex flex-col gap-1 overflow-y-auto px-4 pb-8">
              {navItems.map((item) => (
                <NavItem
                  key={item.title}
                  title={item.title}
                  url={item.url}
                  icon={item.icon}
                  activeIcon={
                    "activeIcon" in item ? item.activeIcon : undefined
                  }
                  isActive={currentPath.startsWith(item.url)}
                />
              ))}
            </nav>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}
