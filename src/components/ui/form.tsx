import { Slot } from "~/lib/slot";
import { useBlocker } from "@tanstack/react-router";
import { BugIcon, Loader2Icon } from "lucide-react";
import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { Button, type ButtonProps } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Json } from "~/lib/dx/json";
import { isProduction } from "~/lib/env";
import { invariant } from "~/lib/invariant";
import { useIsAdmin } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";

type VideoUploadStatus = "idle" | number | "processing";
type ImageUploadStatus = "idle" | "pending";

type FormMediaProviderProps = {
  imageUploadStatus: ImageUploadStatus;
  videoUploadStatus: VideoUploadStatus;
  setImageUploadStatus: (status: ImageUploadStatus) => void;
  setVideoUploadStatus: (status: VideoUploadStatus) => void;
  isMediaUploading: boolean;
};

const FormMediaContext = React.createContext<FormMediaProviderProps>({
  imageUploadStatus: "idle",
  setImageUploadStatus: () => ({}),
  setVideoUploadStatus: () => ({}),
  isMediaUploading: false,
  videoUploadStatus: "idle",
});

const useFormMedia = () => {
  const context = React.useContext(FormMediaContext);
  invariant(context, "useFormMedia must be used within a FormMediaProvider");
  return context;
};

function FormMediaProvider({ children }: { children: React.ReactNode }) {
  const [videoUploadStatus, setVideoUploadStatus] =
    React.useState<VideoUploadStatus>("idle");
  const [imageUploadStatus, setImageUploadStatus] =
    React.useState<ImageUploadStatus>("idle");

  const shouldBlock =
    videoUploadStatus !== "idle" || imageUploadStatus !== "idle";

  useBlocker({
    enableBeforeUnload: shouldBlock,
    shouldBlockFn: () => shouldBlock,
  });

  return (
    <FormMediaContext.Provider
      value={{
        imageUploadStatus,
        videoUploadStatus,
        isMediaUploading:
          imageUploadStatus !== "idle" || videoUploadStatus !== "idle",
        setImageUploadStatus,
        setVideoUploadStatus,
      }}
    >
      {children}
    </FormMediaContext.Provider>
  );
}

function FormNavigationBlock() {
  const { formState } = useFormContext();
  const { videoUploadStatus, imageUploadStatus } = useFormMedia();

  const isVideoUploading = videoUploadStatus !== "idle";
  const isImageUploading = imageUploadStatus !== "idle";

  const shouldBlock =
    isProduction &&
    (isVideoUploading ||
      isImageUploading ||
      (formState.isDirty && !formState.isSubmitSuccessful));

  useBlocker({
    enableBeforeUnload: shouldBlock,
    shouldBlockFn: () => {
      if (shouldBlock) {
        const shouldLeave = confirm(
          "Are you sure you want to leave? You have unsaved changes.",
        );

        return !shouldLeave;
      }

      return false;
    },
  });

  return null;
}

type FormProps<TFieldValues extends FieldValues> = {
  rhf: UseFormReturn<TFieldValues>;
} & React.FormHTMLAttributes<HTMLFormElement>;

function Form<TFieldValues extends FieldValues>({
  children,
  rhf,
  ...props
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...rhf}>
      <FormMediaProvider>
        <FormNavigationBlock />
        <form {...props}>{children}</form>
      </FormMediaProvider>
    </FormProvider>
  );
}

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

function FormItem({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>;
}) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        ref={ref}
        className={cn("flex flex-col gap-1.5", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}
FormItem.displayName = "FormItem";

function FormLabel({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof Label> & {
  ref?: React.Ref<React.ElementRef<typeof Label>>;
}) {
  const { formItemId } = useFormField();

  return (
    <Label ref={ref} className={className} htmlFor={formItemId} {...props} />
  );
}
FormLabel.displayName = "FormLabel";

function FormControl({
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof Slot> & {
  ref?: React.Ref<React.ElementRef<typeof Slot>>;
}) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        error ? `${formDescriptionId} ${formMessageId}` : `${formDescriptionId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
}
FormControl.displayName = "FormControl";

function FormDescription({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
}) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}
FormDescription.displayName = "FormDescription";

function FormMessage({
  className,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
}) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-destructive text-sm font-medium", className)}
      {...props}
    >
      {body}
    </p>
  );
}
FormMessage.displayName = "FormMessage";

function FormSubmitButton({
  busy,
  busyText = "submitting",
  idleText = "submit",
  className,
  ...props
}: ButtonProps & {
  busy?: boolean;
  busyText?: string;
  idleText?: string;
}) {
  const isAdmin = useIsAdmin();
  const { isMediaUploading } = useFormMedia();
  const disabled = busy || isMediaUploading;

  const button = (
    <Button
      disabled={disabled}
      iconLeft={busy && <Loader2Icon className="size-4 animate-spin" />}
      type="submit"
      className={cn("self-start", className)}
      {...props}
    >
      <span>{busy ? busyText : idleText}</span>
    </Button>
  );

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <FormDebug />
        {button}
      </div>
    );
  }

  return button;
}

function FormDebug() {
  const isAdmin = useIsAdmin();
  const {
    watch,
    formState: { errors },
  } = useFormContext();

  const values = watch();

  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className=""
        >
          <BugIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="sr-only">
          <DialogTitle>debug</DialogTitle>
        </DialogHeader>
        <Json
          className="w-full border-none"
          data={{
            values,
            errors,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMediaProvider,
  FormMessage,
  FormSubmitButton,
  useFormField,
  useFormMedia,
};
