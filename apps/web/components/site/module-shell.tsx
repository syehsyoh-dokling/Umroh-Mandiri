import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BrandMark } from "@/components/site/brand-mark";
import { SharedCalculatorCart } from "@/components/site/shared-calculator-cart";
import { Button } from "@/components/ui/button";

export function ModuleShell({
  eyebrow,
  title,
  description,
  backHref = "/menu",
  backLabel = "Kembali",
  showCalculatorCart = false,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  showCalculatorCart?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="post-auth-shell">
        <section className="post-auth-hero">
          <div className="post-auth-hero-fade" aria-hidden />

          <div className="post-auth-hero-inner">
            <div className="post-auth-topbar">
              <div className="flex justify-start">
                <Link href={backHref}>
                  <Button variant="ghost" className="h-10 border-white/30 bg-white/12 px-4 text-white hover:bg-white/20">
                    <ArrowLeft className="h-4 w-4" />
                    {backLabel}
                  </Button>
                </Link>
              </div>

              <div className="flex justify-center" />
              <div className="hidden sm:block" />
            </div>

            <div className="post-auth-brand">
              <div className="post-auth-brand-mark">
                <BrandMark className="h-12 w-12 sm:h-14 sm:w-14" />
              </div>
              <h1 className="post-auth-brand-title">MUWAHID</h1>
              <p className="post-auth-brand-tagline">Asisten Umroh Digital</p>
            </div>

            <div className="post-auth-intro text-center">
              <h1 className="post-auth-intro-title text-[clamp(1.8rem,3.5vw,2.8rem)] text-[#f7eddb]">
                {title}
              </h1>
              <p className="post-auth-intro-subtitle mt-3">{description}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/82 sm:text-sm">{eyebrow}</p>
            </div>
          </div>
        </section>

        {children}
      </main>
      {showCalculatorCart ? <SharedCalculatorCart /> : null}
    </>
  );
}
