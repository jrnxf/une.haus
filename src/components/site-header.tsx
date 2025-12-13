import { Link } from "@tanstack/react-router";
import React from "react";

import { CommandMenu } from "~/components/command-menu";
import { MatrixText } from "~/components/matrix-text";
import { Button } from "~/components/ui/button";

// export function SiteHeaderWeb() {
//   return (
//     <header className="hidden h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) sm:flex">
//       <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
//         <SidebarTrigger className="-ml-1" size="icon-xs" />
//         {/* TODO COLBY there are two of these in the dom bc of below - don't do this. FIX */}
//         <NavigationKeyProvider>
//           <NavCommandMenu />
//         </NavigationKeyProvider>

//         <div className="ml-auto flex items-center gap-2">
//           <Button variant="ghost" asChild size="sm">
//             <Link to="/" className="dark:text-foreground">
//               <MatrixText text="une.haus" dropHeight={24} />
//             </Link>
//           </Button>
//         </div>
//       </div>
//     </header>
//   );
// }

export function SiteHeaderMobile() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b p-1 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) sm:hidden">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex w-full items-center justify-between gap-2">
          <NavigationKeyProvider>
            <NavCommandMenu />
          </NavigationKeyProvider>

          <Button variant="ghost" asChild size="sm">
            <Link to="/" className="dark:text-foreground">
              <MatrixText text="une.haus" dropHeight={24} />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

const NavigationKeyContext = React.createContext<{
  key: number;
  incrementKey: () => void;
}>({
  key: 0,
  incrementKey: () => {},
});

export function useNavigationKey() {
  return React.useContext(NavigationKeyContext);
}

export function NavigationKeyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [key, setKey] = React.useState(0);

  const incrementKey = () => {
    setKey((key) => key + 1);
  };

  return (
    <NavigationKeyContext.Provider value={{ key, incrementKey }}>
      {children}
    </NavigationKeyContext.Provider>
  );
}

function NavCommandMenu() {
  const { key } = useNavigationKey();
  return <CommandMenu key={key} />;
}
