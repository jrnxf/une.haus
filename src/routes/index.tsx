import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardPenIcon,
  EarthIcon,
  KeySquareIcon,
  MedalIcon,
  MessagesSquareIcon,
  UserIcon,
} from "lucide-react";

import { Logo } from "~/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { useIsMobile } from "~/hooks/use-mobile";
import { useSessionUser } from "~/lib/session/hooks";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

const navItems = [
  {
    title: "Games",
    url: "/games/rius/active",
    icon: MedalIcon,
  },
  {
    title: "Users",
    url: "/users",
    icon: EarthIcon,
  },
  {
    title: "Posts",
    url: "/posts",
    icon: ClipboardPenIcon,
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessagesSquareIcon,
  },
  {
    title: "Vault",
    url: "/vault",
    icon: KeySquareIcon,
  },
];

function RouteComponent() {
  const isMobile = useIsMobile();
  console.log("isMobile", isMobile);
  return <MobileHome />;
  // if (isMobile) {
  //   return <MobileHome />;
  // }

  // return (
  //   <div className="grid h-full place-items-center">
  //     <div className="w-[min(80vw,270px)]">
  //       <Logo />
  //     </div>
  //   </div>
  // );
}

function MobileHome() {
  const sessionUser = useSessionUser();

  return (
    <div className="grid size-full place-items-center">
      <div className="space-y-4 p-4">
        {/* Logo */}
        <Logo className="h-14 shrink-0 fill-black stroke-zinc-300 dark:fill-white dark:stroke-zinc-900" />

        {/* Navigation */}
        <nav className="flex flex-col items-center gap-2 sm:hidden">
          {navItems.map((item) => (
            <Button
              key={item.title}
              variant="ghost"
              className="h-14 w-full min-w-[200px] justify-center gap-3 text-xl"
              asChild
            >
              <Link to={item.url}>
                <item.icon className="size-5" />
                {item.title}
              </Link>
            </Button>
          ))}
          {sessionUser ? (
            <Button variant="ghost" className="h-14 gap-3" asChild>
              <Link to="/auth/me">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage
                    src={sessionUser.avatarUrl}
                    alt={sessionUser.name}
                  />
                  <AvatarFallback
                    name={sessionUser.name}
                    className="rounded-full"
                  />
                </Avatar>
                <span className="text-lg">{sessionUser.name}</span>
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-12 min-w-[200px] gap-2 text-base"
              asChild
            >
              <Link to="/auth/code/send">
                <UserIcon className="size-5" />
                Log in
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </div>
  );
}
