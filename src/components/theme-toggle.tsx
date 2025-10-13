import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useSessionTheme } from "~/lib/session/hooks";

export function ThemeToggle() {
  const { theme, toggle } = useSessionTheme();
  return (
    <Button onClick={() => toggle()} variant="ghost" size="sm-icon">
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </Button>
  );
}
