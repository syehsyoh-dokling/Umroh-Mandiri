import * as React from "react";

import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export { Select };
