import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { type z } from "zod";

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
import { Textarea } from "~/components/ui/textarea";
import { games } from "~/lib/games";
import {
  useBackUpSet,
  useFlagSet,
  useStartChain,
} from "~/lib/games/bius/hooks";

export function StartChainForm() {
  const rhf = useForm<z.infer<typeof games.bius.chain.start.schema>>({
    resolver: zodResolver(games.bius.chain.start.schema),
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
            <FormLabel>Set Name</FormLabel>
            <FormDescription>Name the set you&apos;re starting</FormDescription>
            <FormControl>
              <Input {...field} placeholder="e.g. 360 unispin" />
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
              Record yourself doing the set to start the chain
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
          <Link to="/games/bius">cancel</Link>
        </Button>
        <FormSubmitButton busy={startChain.isPending}>
          Start Chain
        </FormSubmitButton>
      </div>
    </Form>
  );
}

export function BackUpSetForm({ parentSetId }: { parentSetId: number }) {
  const rhf = useForm<z.infer<typeof games.bius.sets.backUp.schema>>({
    resolver: zodResolver(games.bius.sets.backUp.schema),
    defaultValues: {
      parentSetId,
    },
  });

  const { control, handleSubmit } = rhf;

  const backUpSet = useBackUpSet();

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit((data) => {
          backUpSet.mutate({ data });
        })(event);
      }}
    >
      <FormField
        control={control}
        name="parentSetId"
        render={({ field }) => <input type="hidden" {...field} />}
      />

      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>New Set Name</FormLabel>
            <FormDescription>
              Name the NEW set you&apos;re setting (after landing the previous
              one)
            </FormDescription>
            <FormControl>
              <Input {...field} placeholder="e.g. 360 unispin" />
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
              Record landing the previous set AND setting a new one
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
          <Link to="/games/bius">cancel</Link>
        </Button>
        <FormSubmitButton busy={backUpSet.isPending}>
          Back It Up
        </FormSubmitButton>
      </div>
    </Form>
  );
}

export function FlagSetForm({
  setId,
  onSuccess,
}: {
  setId: number;
  onSuccess?: () => void;
}) {
  const rhf = useForm<z.infer<typeof games.bius.sets.flag.schema>>({
    resolver: zodResolver(games.bius.sets.flag.schema),
    defaultValues: {
      setId,
    },
  });

  const { control, handleSubmit } = rhf;

  const flagSet = useFlagSet();

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit((data) => {
          flagSet.mutate(
            { data },
            {
              onSuccess,
            },
          );
        })(event);
      }}
    >
      <FormField
        control={control}
        name="setId"
        render={({ field }) => <input type="hidden" {...field} />}
      />

      <FormField
        control={control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reason for flagging</FormLabel>
            <FormDescription>
              Explain why you think this set was done incorrectly
            </FormDescription>
            <FormControl>
              <Textarea
                {...field}
                placeholder="e.g. The rider didn't fully land the previous set"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormSubmitButton busy={flagSet.isPending} variant="destructive">
        Submit Flag
      </FormSubmitButton>
    </Form>
  );
}
