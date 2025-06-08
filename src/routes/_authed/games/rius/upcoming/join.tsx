import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { type z } from "zod";

import { VideoInput } from "~/components/input/video-input";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { games } from "~/lib/games";
import { useCreateSet } from "~/lib/games/rius/hooks";

export const Route = createFileRoute("/_authed/games/rius/upcoming/join")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.upcoming.roster.queryOptions(),
    );
  },
});

function RouteComponent() {
  const { data } = useSuspenseQuery(games.rius.upcoming.roster.queryOptions());

  return (
    <div>
      <h1>Join</h1>
      {data.authUserSets && data.authUserSets.length === 3 ? (
        <>
          <p>You have already uploaded all the allowable sets!</p>
          <Button asChild>
            <Link to="/games/rius/upcoming">Back</Link>
          </Button>
        </>
      ) : (
        <JoinRiuForm />
      )}
    </div>
  );
}

function JoinRiuForm() {
  const form = useForm<z.infer<typeof games.rius.sets.create.schema>>({
    resolver: zodResolver(games.rius.sets.create.schema),
  });

  const { control, handleSubmit } = form;

  const createSet = useCreateSet();

  return (
    <Form {...form}>
      <form
        className="mx-auto flex w-full max-w-4xl flex-col gap-4"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit((data) => {
            createSet.mutate({ data });
          })(event);
        }}
      >
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="videoUploadId"
          render={({ field: { onChange } }) => (
            <FormItem>
              <FormLabel>Video</FormLabel>
              <VideoInput onChange={onChange} />
            </FormItem>
          )}
        />

        <div className="flex justify-between gap-2">
          <Button asChild type="button" variant="outline">
            <Link to="/games/rius/upcoming">Cancel</Link>
          </Button>
          <FormSubmitButton busy={createSet.isPending} />
        </div>
      </form>
    </Form>
  );
}
