import { DrawerPreview as DrawerPrimitive } from "@base-ui/react/drawer";
import { Link, useMatches } from "@tanstack/react-router";
import {
  ChevronUpIcon,
  ClipboardPenIcon,
  EarthIcon,
  GaugeIcon,
  LockIcon,
  LockOpenIcon,
  MapPinIcon,
  MedalIcon,
  MessagesSquareIcon,
  MonitorIcon,
  MoonIcon,
  Send,
  ShoppingBagIcon,
  SunIcon,
  TimerIcon,
  TrafficConeIcon,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";

import {
  MobileNavContext,
  useMobileNav,
} from "~/components/mobile-nav-context";
import { Button } from "~/components/ui/button";
import { usePeripherals } from "~/hooks/use-peripherals";
import { useTheme, type Theme } from "~/lib/theme/context";
import { cn } from "~/lib/utils";

const navItems = [
  { title: "games", url: "/games", icon: MedalIcon },
  { title: "users", url: "/users", icon: EarthIcon },
  { title: "posts", url: "/posts", icon: ClipboardPenIcon },
  { title: "chat", url: "/chat", icon: MessagesSquareIcon },
  { title: "map", url: "/map", icon: MapPinIcon },
  { title: "tricks", url: "/tricks", icon: TrafficConeIcon },
  {
    title: "vault",
    url: "/vault",
    icon: LockIcon,
    activeIcon: LockOpenIcon,
  },
  { title: "events", url: "/events", icon: TimerIcon },
  { title: "stats", url: "/stats", icon: GaugeIcon },
  { title: "shop", url: "/shop", icon: ShoppingBagIcon },
  { title: "feedback", url: "/feedback", icon: Send },
] as const;

const themeOrder: Theme[] = ["system", "dark", "light"];
const themeIcon: Record<Theme, LucideIcon> = {
  system: MonitorIcon,
  dark: MoonIcon,
  light: SunIcon,
};

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
    <Link
      to={url}
      replace
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-3 text-base transition-colors",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <ResolvedIcon className="size-5" />
      <span>{title}</span>
    </Link>
  );
}

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = usePeripherals("nav");

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
      variant="secondary"
      size="icon-sm"
      onClick={openNav}
      className={cn("lg:hidden", className)}
    >
      <ChevronUpIcon />
    </Button>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const ThemeIcon = themeIcon[theme];

  const cycleTheme = () => {
    const next =
      themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
    setTheme(next);
  };

  return (
    <button
      onClick={cycleTheme}
      className="text-muted-foreground hover:bg-accent/50 hover:text-foreground flex items-center gap-3 rounded-md px-3 py-3 text-base transition-colors"
    >
      <ThemeIcon className="size-5" />
      <span>color mode ({theme})</span>
    </button>
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
              <ThemeToggle />
            </nav>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}
