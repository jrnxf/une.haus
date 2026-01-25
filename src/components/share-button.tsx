import { ShareIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";

export function ShareButton() {
  return (
    <Button
      size="icon-sm"
      variant="outline"
      aria-label="Share"
      onClick={() => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied");
      }}
    >
      <ShareIcon className="size-4" />
    </Button>
  );
}
