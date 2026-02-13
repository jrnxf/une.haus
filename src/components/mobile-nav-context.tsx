import { createContext, useContext } from "react";

export const MobileNavContext = createContext<(() => void) | null>(null);

export function useMobileNav() {
  const open = useContext(MobileNavContext);
  if (!open) throw new Error("useMobileNav must be used within MobileNavProvider");
  return open;
}
