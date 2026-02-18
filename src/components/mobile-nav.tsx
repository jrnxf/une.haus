import { DrawerPreview as DrawerPrimitive } from "@base-ui/react/drawer";
import { useQuery } from "@tanstack/react-query";
import { Link, useMatches } from "@tanstack/react-router";
import {
  ActivityIcon,
  BellIcon,
  StickyNoteIcon,
  EarthIcon,
  JoystickIcon,
  LockIcon,
  LockOpenIcon,
  LogOutIcon,
  MapPinIcon,
  MedalIcon,
  MenuIcon,
  MessagesSquareIcon,
  MonitorIcon,
  MoonIcon,
  PencilIcon,
  Send,
  ShoppingBagIcon,
  SunIcon,
  TrafficConeIcon,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";

import { BracketIcon } from "~/components/icons/bracket-icon";
import {
  MobileNavContext,
  useMobileNav,
} from "~/components/mobile-nav-context";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { usePeripherals } from "~/hooks/use-peripherals";
import { notifications } from "~/lib/notifications";
import { useLogout, useSessionUser } from "~/lib/session/hooks";
import { useTheme, type Theme } from "~/lib/theme/context";
import { cn } from "~/lib/utils";

const navItems = [
  { title: "games", url: "/games", icon: MedalIcon },
  { title: "users", url: "/users", icon: EarthIcon },
  { title: "posts", url: "/posts", icon: StickyNoteIcon },
  { title: "chat", url: "/chat", icon: MessagesSquareIcon },
  { title: "map", url: "/map", icon: MapPinIcon },
  { title: "tricks", url: "/tricks", icon: TrafficConeIcon },
  {
    title: "vault",
    url: "/vault",
    icon: LockIcon,
    activeIcon: LockOpenIcon,
  },
  { title: "tourney", url: "/tourney", icon: BracketIcon },
  { title: "metrics", url: "/metrics", icon: ActivityIcon },
  { title: "shop", url: "/shop", icon: ShoppingBagIcon },
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
        "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-foreground hover:bg-accent/50",
      )}
    >
      <ResolvedIcon className="size-4" />
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
      className={cn("bg-muted/30 fixed inset-0", className)}
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
      size="icon"
      onClick={openNav}
      className={cn("md:hidden", className)}
    >
      <MenuIcon />
    </Button>
  );
}

function IconButton({
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn(
        "hover:bg-accent/50 rounded-md p-2",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

function IconLink({
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        "hover:bg-accent/50 rounded-md p-2",
        props.className,
      )}
    >
      {children}
    </Link>
  );
}

function MobileNavFooter() {
  const sessionUser = useSessionUser();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  const ThemeIcon = themeIcon[theme];

  const { data: unreadCount = 0 } = useQuery({
    ...notifications.unreadCount.queryOptions(),
    enabled: !!sessionUser,
  });

  const cycleTheme = () => {
    const next =
      themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];
    setTheme(next);
  };

  if (!sessionUser) {
    return (
      <div className="mt-2 flex items-center gap-2 border-t pt-3">
        <Link
          to="/auth/code/send"
          className="text-sm font-medium flex-1 px-2"
        >
          log in
        </Link>
        <IconLink to="/feedback">
          <Send className="size-4" />
        </IconLink>
        <IconLink to="/game">
          <JoystickIcon className="size-4" />
        </IconLink>
        <IconButton onClick={cycleTheme}>
          <ThemeIcon className="size-4" />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-2 border-t pt-3">
      <Link
        to="/users/$userId"
        params={{ userId: sessionUser.id }}
        className="hover:bg-accent/50 flex items-center gap-2 rounded-md p-1 pr-2 min-w-0"
      >
        <Avatar
          className="size-7 rounded-lg"
          cloudflareId={sessionUser.avatarId}
          alt={sessionUser.name}
        >
          <AvatarImage width={64} quality={85} />
          <AvatarFallback name={sessionUser.name} className="rounded-lg text-xs" />
        </Avatar>
        <span className="truncate text-sm font-medium">
          {sessionUser.name}
        </span>
      </Link>
      <div className="flex items-center">
        <IconLink to="/feedback">
          <Send className="size-4" />
        </IconLink>
        <IconLink to="/game">
          <JoystickIcon className="size-4" />
        </IconLink>
        <IconButton onClick={cycleTheme}>
          <ThemeIcon className="size-4" />
        </IconButton>
        <IconLink to="/notifications" className="relative">
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </IconLink>
        <IconLink to="/auth/me/edit">
          <PencilIcon className="size-4" />
        </IconLink>
        <IconButton onClick={() => logout({})}>
          <LogOutIcon className="size-4" />
        </IconButton>
      </div>
    </div>
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
        <DrawerPrimitive.Popup className="bg-background flex max-h-[90vh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] flex-col rounded-t-xl border-t transition-transform duration-200 ease-in-out outline-none data-[ending-style]:[transform:translateY(100%)] data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-[starting-style]:[transform:translateY(100%)]">
          <div
            aria-hidden
            className="bg-muted mx-auto my-4 h-1.5 w-12 rounded-full"
          />
          <DrawerPrimitive.Content>
            <nav className="overflow-y-auto px-4 pb-6">
              <div className="grid grid-cols-2 gap-1">
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
              </div>
              <MobileNavFooter />
            </nav>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}
