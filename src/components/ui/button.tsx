import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg hover:-translate-y-0.5",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5 shadow-sm hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-primary via-primary-glow to-primary text-primary-foreground hover:from-primary/90 hover:via-primary-glow/90 hover:to-primary/90 shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:scale-105",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-md hover:shadow-lg hover:-translate-y-0.5",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-md hover:shadow-lg hover:-translate-y-0.5",
        info: "bg-info text-info-foreground hover:bg-info/90 shadow-md hover:shadow-lg hover:-translate-y-0.5",
        glass: "bg-white/80 dark:bg-black/80 backdrop-blur-md border border-white/20 dark:border-white/10 text-foreground hover:bg-white/90 dark:hover:bg-black/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        gradient: "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:from-primary/90 hover:to-primary-glow/90 shadow-lg hover:shadow-2xl hover:-translate-y-1",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
