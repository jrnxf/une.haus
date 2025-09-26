import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { type z } from "zod";

import { BadgeInput } from "~/components/input/badge-input";
import { ImageInput } from "~/components/input/image-input";
import { LocationSelector } from "~/components/input/location-selector";
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
import { USER_DISCIPLINES } from "~/db/schema";
import { users } from "~/lib/users";

export function UserForm({
  user,
}: {
  user?: z.infer<typeof users.update.schema> & { id?: number };
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const updateUser = useMutation({
    mutationFn: users.update.fn,
    onSuccess: async () => {
      if (user?.id) {
        await qc.invalidateQueries({
          queryKey: users.get.queryOptions({ userId: user.id }).queryKey,
        });
      }
      toast.success("Profile updated");

      navigate({
        to: "/auth/me",
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<z.infer<typeof users.update.schema>>({
    defaultValues: user,
    resolver: zodResolver(users.update.schema),
  });

  const { control, handleSubmit } = form;

  return (
    <Form {...form}>
      <form
        className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-8"
        id="main-content"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit((data) => {
            updateUser.mutate({ data });
          })(event);
        }}
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
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
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <LocationSelector
                    onUpdate={field.onChange}
                    placeholder={user?.location?.label}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="disciplines"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Disciplines</FormLabel>
              <FormControl>
                <BadgeInput
                  defaultSelections={field.value}
                  onChange={field.onChange}
                  options={USER_DISCIPLINES}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <FormField
            control={control}
            name="socials.facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="socials.tiktok"
            render={({ field }) => (
              <FormItem>
                <FormLabel>TikTok</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="socials.twitter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Twitter</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="socials.youtube"
            render={({ field }) => (
              <FormItem>
                <FormLabel>YouTube</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="socials.instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="socials.spotify"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spotify</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="avatarUrl"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>Avatar</FormLabel>
                <ImageInput
                  previewClassNames="rounded-md size-86"
                  value={field.value}
                  onChange={(data) => {
                    field.onChange(
                      data ? { type: "image", value: data } : undefined,
                    );
                  }}
                />
              </FormItem>
            );
          }}
        />

        <div className="flex justify-end gap-2">
          <Button asChild variant="secondary">
            <Link to="/auth/me">Cancel</Link>
          </Button>
          <FormSubmitButton busy={updateUser.isPending} />
        </div>
      </form>
    </Form>
  );
}
