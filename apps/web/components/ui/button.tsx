import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full border text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[var(--primary)] px-6 py-3 text-white shadow-[var(--shadow-soft)] hover:bg-[var(--primary-strong)]",
        secondary:
          "border-transparent bg-[var(--secondary)] px-6 py-3 text-[#1f1d16] shadow-[var(--shadow-soft)] hover:bg-[var(--secondary-strong)]",
        ghost:
          "border-[color:var(--line)] bg-white/50 px-6 py-3 text-[var(--foreground)] hover:bg-white/80",
      },
      size: {
        default: "h-12",
        lg: "h-14 px-7 text-base",
        sm: "h-10 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
