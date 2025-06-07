import { Slot } from "@radix-ui/react-slot";
import { Loader2Icon } from "lucide-react";
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
import { Label } from "~/components/ui/label";
import { invariant } from "~/lib/invariant";
import { cn } from "~/lib/utils";

type VideoUploadStatus = "idle" | number;
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

type FormProps<TFieldValues extends FieldValues> =
  UseFormReturn<TFieldValues> & {
    children: React.ReactNode;
  };

function Form<TFieldValues extends FieldValues>({
  children,
  ...methods
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...methods}>
      <FormMediaProvider>{children}</FormMediaProvider>
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

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
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
});
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { formItemId } = useFormField();

  return (
    <Label ref={ref} className={className} htmlFor={formItemId} {...props} />
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
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
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
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
});
FormMessage.displayName = "FormMessage";

function FormSubmitButton({
  busy,
  busyText = "Submitting",
  idleText = "Submit",
  className,
  ...props
}: ButtonProps & {
  busy?: boolean;
  busyText?: string;
  idleText?: string;
}) {
  const { isMediaUploading } = useFormMedia();
  const disabled = busy || isMediaUploading;

  return (
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
