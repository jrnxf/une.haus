import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type z } from "zod";

import { TrickLine } from "~/components/games/sius/trick-line";
import { VideoInput } from "~/components/input/video-input";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { games } from "~/lib/games";
import { useStackUp, useStartChain } from "~/lib/games/sius/hooks";

export function StartChainForm() {
  const rhf = useForm<z.infer<typeof games.sius.chain.start.schema>>({
    resolver: zodResolver(games.sius.chain.start.schema),
  });

  const { control, handleSubmit } = rhf;

  const startChain = useStartChain();

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit((data) => {
          startChain.mutate({ data });
        })(event);
      }}
    >
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Trick Name</FormLabel>
            <FormDescription>Name the first trick in the line</FormDescription>
            <FormControl>
              <Input {...field} placeholder="e.g. Kickflip" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="muxAssetId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Video</FormLabel>
            <FormDescription>
              Record yourself performing this trick
            </FormDescription>
            <FormControl>
              <VideoInput {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex justify-between gap-2">
        <Button asChild type="button" variant="outline">
          <Link to="/games/sius">cancel</Link>
        </Button>
        <FormSubmitButton busy={startChain.isPending}>
          Start Chain
        </FormSubmitButton>
      </div>
    </Form>
  );
}

export function StackUpForm({ parentStackId }: { parentStackId: number }) {
  const rhf = useForm<z.infer<typeof games.sius.stacks.stackUp.schema>>({
    resolver: zodResolver(games.sius.stacks.stackUp.schema),
    defaultValues: {
      parentStackId,
    },
  });

  const { control, handleSubmit } = rhf;

  const stackUp = useStackUp();

  // Get the line of tricks that need to be landed
  const { data: line } = useSuspenseQuery(
    games.sius.stacks.line.queryOptions({ stackId: parentStackId }),
  );

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit((data) => {
          stackUp.mutate({ data });
        })(event);
      }}
    >
      <FormField
        control={control}
        name="parentStackId"
        render={({ field }) => <input type="hidden" {...field} />}
      />

      {line && line.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <TrickLine tricks={line} />
        </div>
      )}

      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Your New Trick</FormLabel>
            <FormDescription>
              Name the NEW trick you&apos;re adding to the line
            </FormDescription>
            <FormControl>
              <Input {...field} placeholder="e.g. 360 Flip" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="muxAssetId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Video</FormLabel>
            <FormDescription>
              Record yourself landing ALL previous tricks in order, then your
              new trick
            </FormDescription>
            <FormControl>
              <VideoInput {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex justify-between gap-2">
        <Button asChild type="button" variant="outline">
          <Link to="/games/sius">cancel</Link>
        </Button>
        <FormSubmitButton busy={stackUp.isPending}>Stack It Up</FormSubmitButton>
      </div>
    </Form>
  );
}
