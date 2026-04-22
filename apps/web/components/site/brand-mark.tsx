import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/logo-muwahid-legacy.png"
      alt="Logo MUWAHID"
      width={96}
      height={96}
      className={cn(
        "h-12 w-12 object-contain",
        className
      )}
    />
  );
}
