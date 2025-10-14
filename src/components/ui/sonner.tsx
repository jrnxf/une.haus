import { useEffect } from "react";

import { Toaster as Sonner, toast } from "sonner";

import { useSessionFlash } from "~/lib/session/hooks";
import { useTheme } from "~/lib/theme/context";

type ToasterProperties = React.ComponentProps<typeof Sonner>;

export function Toaster(properties: ToasterProperties) {
  const { theme } = useTheme();

  useFlashToaster();

  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      theme={theme as ToasterProperties["theme"]}
      toastOptions={{
        classNames: {
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          description: "group-[.toast]:text-muted-foreground",
          toast:
            "group font-mono whitespace-pre-wrap toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
        },
      }}
      {...properties}
    />
  );
}

function useFlashToaster() {
  const sessionFlash = useSessionFlash();

  useEffect(() => {
    if (sessionFlash) {
      requestAnimationFrame(() => {
        // ensures the toast has a proper transition in
        toast(sessionFlash);
      });
    }
  }, [sessionFlash]);
}
