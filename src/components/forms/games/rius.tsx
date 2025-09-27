import { Link } from "@tanstack/react-router";
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
import { useCreateSet, useCreateSubmission } from "~/lib/games/rius/hooks";

export function CreateRiuSetForm() {
  const rhf = useForm<z.infer<typeof games.rius.sets.create.schema>>({
    resolver: zodResolver(games.rius.sets.create.schema),
  });

  const { control, handleSubmit } = rhf;

  const createSet = useCreateSet();

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
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
            <FormLabel>title</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>instructions</FormLabel>
            <FormControl>
              <Textarea {...field} />
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
            <FormControl>
              <VideoInput {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex justify-between gap-2">
        <Button asChild type="button" variant="outline">
          <Link to="/games/rius/upcoming">cancel</Link>
        </Button>
        <FormSubmitButton busy={createSet.isPending} />
      </div>
    </Form>
  );
}

export function CreateRiuSubmissionForm({ riuSetId }: { riuSetId: number }) {
  const rhf = useForm<z.infer<typeof games.rius.submissions.create.schema>>({
    resolver: zodResolver(games.rius.submissions.create.schema),
    defaultValues: {
      riuSetId,
    },
  });

  const { control, handleSubmit } = rhf;

  const createSubmission = useCreateSubmission();

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      method="post"
      onSubmit={handleSubmit((data) => {
        createSubmission.mutate({ data });
      })}
    >
      <FormField
        control={control}
        name="riuSetId"
        render={({ field }) => <input type="hidden" {...field} />}
      />

      <FormField
        control={control}
        name="muxAssetId"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <VideoInput
                {...field}
                showPreview={false}
                onChange={(assetId) => {
                  field.onChange(assetId);
                  handleSubmit((data) => {
                    createSubmission.mutate({ data });
                  })();
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  );
}
