import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronDown, type LucideIcon } from "lucide-react"
import * as React from "react"

import { cn } from "~/lib/utils"

const buttonVariants = cva(
  "group ring-offset-background inline-flex cursor-pointer items-center justify-center text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-60 has-data-[arrow=true]:justify-between [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 data-[state=open]:bg-primary/90",
        mono: "bg-zinc-950 text-white hover:bg-zinc-950/90 data-[state=open]:bg-zinc-950/90 dark:bg-zinc-300 dark:text-black dark:hover:bg-zinc-300/90 dark:data-[state=open]:bg-zinc-300/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 data-[state=open]:bg-destructive/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 data-[state=open]:bg-secondary/90",
        outline:
          "border-input bg-background text-accent-foreground hover:bg-accent data-[state=open]:bg-accent border",
        dashed:
          "border-input bg-background text-accent-foreground hover:bg-accent hover:text-accent-foreground data-[state=open]:text-accent-foreground border",
        ghost:
          "text-accent-foreground hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        dim: "text-muted-foreground hover:text-foreground data-[state=open]:text-foreground",
        foreground: "",
        inverse: "",
      },
      appearance: {
        default: "",
        ghost: "",
      },
      underline: {
        solid: "",
        dashed: "",
      },
      underlined: {
        solid: "",
        dashed: "",
      },
      size: {
        lg: "h-10 gap-1.5 px-4 text-sm [&_svg:not([class*=size-])]:size-4",
        md: "h-9 gap-1.5 px-3 text-sm [&_svg:not([class*=size-])]:size-4",
        sm: "h-8 gap-1.25 px-2.5 text-xs [&_svg:not([class*=size-])]:size-3.5",
        xs: "h-7 gap-1 px-2 text-xs [&_svg:not([class*=size-])]:size-3.5",
        icon: "size-9 shrink-0 [&_svg:not([class*=size-])]:size-4",
      },
      autoHeight: {
        true: "",
        false: "",
      },
      radius: {
        md: "rounded-md",
        full: "rounded-full",
      },
      mode: {
        default:
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
        icon: "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
        link: "text-primary h-auto rounded-none bg-transparent p-0 hover:bg-transparent data-[state=open]:bg-transparent",
        input: `hover:bg-background [&_svg]:hover:text-foreground data-[state=open]:bg-background focus-visible:border-ring focus-visible:ring-ring/30 [[data-state=open]>&]:border-ring [[data-state=open]>&]:ring-ring/30 aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10 dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/20 in-data-[invalid=true]:border-destructive/60 in-data-[invalid=true]:ring-destructive/10 dark:in-data-[invalid=true]:border-destructive dark:in-data-[invalid=true]:ring-destructive/20 justify-start font-normal focus-visible:ring-[3px] focus-visible:outline-hidden [&_svg]:transition-colors [[data-state=open]>&]:ring-[3px] [[data-state=open]>&]:outline-hidden`,
      },
      placeholder: {
        true: "text-muted-foreground",
        false: "",
      },
    },
    compoundVariants: [
      // Icons opacity for default mode
      {
        variant: "ghost",
        mode: "default",
        className:
          "[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60",
      },
      {
        variant: "outline",
        mode: "default",
        className:
          "[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60",
      },
      {
        variant: "dashed",
        mode: "default",
        className:
          "[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60",
      },
      {
        variant: "secondary",
        mode: "default",
        className:
          "[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60",
      },

      // Icons opacity for default mode
      {
        variant: "outline",
        mode: "input",
        className:
          "[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60",
      },
      {
        variant: "outline",
        mode: "icon",
        className:
          "[&_svg:not([role=img]):not([class*=text-]):not([class*=opacity-])]:opacity-60",
      },

      // Auto height
      {
        size: "xs",
        autoHeight: true,
        className: "h-auto min-h-7",
      },
      {
        size: "md",
        autoHeight: true,
        className: "h-auto min-h-9",
      },
      {
        size: "sm",
        autoHeight: true,
        className: "h-auto min-h-8",
      },
      {
        size: "lg",
        autoHeight: true,
        className: "h-auto min-h-10",
      },

      // Shadow support
      {
        variant: "primary",
        mode: "default",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "mono",
        mode: "default",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "secondary",
        mode: "default",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "outline",
        mode: "default",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "dashed",
        mode: "default",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "destructive",
        mode: "default",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },

      // Shadow support
      {
        variant: "primary",
        mode: "icon",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "mono",
        mode: "icon",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "secondary",
        mode: "icon",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "outline",
        mode: "icon",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "dashed",
        mode: "icon",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },
      {
        variant: "destructive",
        mode: "icon",
        appearance: "default",
        className: "shadow-xs shadow-black/5",
      },

      // Link
      {
        variant: "primary",
        mode: "link",
        underline: "solid",
        className:
          "text-primary hover:text-primary/90 font-medium hover:underline hover:decoration-solid hover:underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },
      {
        variant: "primary",
        mode: "link",
        underline: "dashed",
        className:
          "text-primary hover:text-primary/90 font-medium decoration-1 hover:underline hover:decoration-dashed hover:underline-offset-4 [&_svg]:opacity-60",
      },
      {
        variant: "primary",
        mode: "link",
        underlined: "solid",
        className:
          "text-primary hover:text-primary/90 font-medium underline decoration-solid underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },
      {
        variant: "primary",
        mode: "link",
        underlined: "dashed",
        className:
          "text-primary hover:text-primary/90 font-medium underline decoration-dashed decoration-1 underline-offset-4 [&_svg]:opacity-60",
      },

      {
        variant: "inverse",
        mode: "link",
        underline: "solid",
        className:
          "font-medium text-inherit hover:underline hover:decoration-solid hover:underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },
      {
        variant: "inverse",
        mode: "link",
        underline: "dashed",
        className:
          "font-medium text-inherit decoration-1 hover:underline hover:decoration-dashed hover:underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },
      {
        variant: "inverse",
        mode: "link",
        underlined: "solid",
        className:
          "font-medium text-inherit underline decoration-solid underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },
      {
        variant: "inverse",
        mode: "link",
        underlined: "dashed",
        className:
          "font-medium text-inherit underline decoration-dashed decoration-1 underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },

      {
        variant: "foreground",
        mode: "link",
        underline: "solid",
        className:
          "text-foreground font-medium hover:underline hover:decoration-solid hover:underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },
      {
        variant: "foreground",
        mode: "link",
        underline: "dashed",
        className:
          "text-foreground font-medium decoration-1 hover:underline hover:decoration-dashed hover:underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },
      {
        variant: "foreground",
        mode: "link",
        underlined: "solid",
        className:
          "text-foreground font-medium underline decoration-solid underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },
      {
        variant: "foreground",
        mode: "link",
        underlined: "dashed",
        className:
          "text-foreground font-medium underline decoration-dashed decoration-1 underline-offset-4 [&_svg:not([role=img]):not([class*=text-])]:opacity-60",
      },

      // Ghost
      {
        variant: "primary",
        appearance: "ghost",
        className:
          "text-primary/90 hover:bg-primary/5 data-[state=open]:bg-primary/5 bg-transparent",
      },
      {
        variant: "destructive",
        appearance: "ghost",
        className:
          "text-destructive/90 hover:bg-destructive/5 data-[state=open]:bg-destructive/5 bg-transparent",
      },
      {
        variant: "ghost",
        mode: "icon",
        className: "text-muted-foreground",
      },

      // Size
      {
        size: "sm",
        mode: "icon",
        className: "[[&_svg:not([class*=size-])]:size-3.5 h-7 w-7 p-0",
      },
      {
        size: "md",
        mode: "icon",
        className: "h-8.5 w-8.5 p-0 [&_svg:not([class*=size-])]:size-4",
      },
      {
        size: "icon",
        className: "h-8.5 w-8.5 p-0 [&_svg:not([class*=size-])]:size-4",
      },
      {
        size: "lg",
        mode: "icon",
        className: "h-10 w-10 p-0 [&_svg:not([class*=size-])]:size-4",
      },

      // Input mode
      {
        mode: "input",
        placeholder: true,
        variant: "outline",
        className: "text-muted-foreground font-normal",
      },
      {
        mode: "input",
        variant: "outline",
        size: "sm",
        className: "gap-1.25",
      },
      {
        mode: "input",
        variant: "outline",
        size: "md",
        className: "gap-1.5",
      },
      {
        mode: "input",
        variant: "outline",
        size: "lg",
        className: "gap-1.5",
      },
    ],
    defaultVariants: {
      variant: "primary",
      mode: "default",
      size: "md",
      radius: "md",
      appearance: "default",
    },
  },
)

export type ButtonProps = useRender.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    selected?: boolean
    asChild?: boolean
  }

function Button({
  render,
  asChild = false,
  children,
  className,
  selected,
  variant,
  radius,
  appearance,
  mode,
  size,
  autoHeight,
  underlined,
  underline,
  placeholder = false,
  ...props
}: ButtonProps) {
  const defaultProps = {
    "data-slot": "button",
    className: cn(
      buttonVariants({
        variant,
        size,
        radius,
        appearance,
        mode,
        autoHeight,
        placeholder,
        underlined,
        underline,
        className,
      }),
      asChild && props.disabled && "pointer-events-none opacity-50",
    ),
    ...(selected && { "data-state": "open" as const }),
  }

  // Determine render element based on asChild prop
  const renderElement =
    asChild && React.isValidElement(children)
      ? (children as React.ReactElement<
          Record<string, unknown>,
          string | React.JSXElementConstructor<unknown>
        >)
      : render || <button />

  // When using asChild, children becomes the element props, otherwise use children normally
  const finalProps =
    asChild && React.isValidElement(children)
      ? mergeProps(defaultProps, props)
      : mergeProps(defaultProps, { ...props, children })

  const element = useRender({
    render: renderElement,
    props: finalProps,
  })

  return element
}

type ButtonArrowProps = React.SVGProps<SVGSVGElement> & {
  icon?: LucideIcon
}

function ButtonArrow({
  icon: Icon = ChevronDown,
  className,
  ...props
}: ButtonArrowProps) {
  return (
    <Icon
      data-slot="button-arrow"
      className={cn("ms-auto -me-1", className)}
      {...props}
    />
  )
}

export { Button, ButtonArrow, buttonVariants }
