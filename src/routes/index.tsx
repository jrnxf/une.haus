import { createFileRoute } from "@tanstack/react-router";

import { useLongPress } from "@uidotdev/usehooks";
import { toast } from "sonner";
import { useHaptic } from "use-haptic";

import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { triggerHaptic } = useHaptic();

  const longPressEvent = useLongPress(
    () => {
      console.log("done");
      // triggerHaptic();
      toast.success("Haptic triggered");
    },
    {
      onStart: (event) => console.log("Press started"),
      onFinish: (event) => console.log("Press Finished"),
      onCancel: (event) => console.log("Press cancelled"),
      threshold: 500,
    },
  );

  return (
    <div className="grid h-full place-items-center">
      {/* <div className="w-[min(80vw,270px)] space-y-6"> */}
      <Logo />

      <p className="border">
        i have noticed that a lower seat does help for a lot of flip tricks
        because it essentially gives you more airtime and more space to pull up
        on the seat. however, i’ve also found that a lower seat makes rolls more
        awkward, so i’ve tried to find a good middle ground so that rolls and
        floating
        <Button size="icon-xs" variant="ghost" className="float-right">
          ❤️
        </Button>
      </p>
      {/* </div> */}
    </div>
  );
}
