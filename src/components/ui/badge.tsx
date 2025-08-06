import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm hover:shadow-md",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 shadow-sm hover:shadow-md",
        outline: "text-foreground border-border hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80 shadow-sm hover:shadow-md",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/80 shadow-sm hover:shadow-md",
        info:
          "border-transparent bg-info text-info-foreground hover:bg-info/80 shadow-sm hover:shadow-md",
        gradient:
          "border-transparent bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:from-primary/90 hover:to-primary-glow/90 shadow-md hover:shadow-lg",
        glass:
          "border-white/20 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-md text-foreground hover:bg-white/90 dark:hover:bg-black/90 shadow-lg",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
        xl: "px-4 py-1.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
