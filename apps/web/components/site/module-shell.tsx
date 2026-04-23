"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calculator, Hotel, Ticket, type LucideIcon } from "lucide-react";
import { useMemo } from "react";

import { BrandMark } from "@/components/site/brand-mark";
import { PostAuthFooter } from "@/components/site/post-auth-footer";
import { SharedCalculatorCart } from "@/components/site/shared-calculator-cart";
import { Button } from "@/components/ui/button";
import { getFeatureRoute } from "@/lib/feature-routes";
import { useStoredAuthUser } from "@/lib/use-stored-auth-user";

type AuthUser = {
  nama?: string;
};

export function ModuleShell({
  eyebrow,
  title,
  description,
  sectionTitle,
  sectionDescription,
  actions,
  onAction,
  surfaceContent,
  backHref = "/menu",
  backLabel = "Kembali",
  showCalculatorCart = false,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sectionTitle?: string;
  sectionDescription?: string;
  actions?: Array<{
    label: string;
    target: string;
    icon: LucideIcon;
  }>;
  onAction?: (target: string, label: string) => void;
  surfaceContent?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  showCalculatorCart?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useStoredAuthUser<AuthUser>();
  const visitorName = useMemo(() => user?.nama?.trim() || "Jamaah MUWAHID", [user?.nama]);
  const headerActions =
    actions ??
    [
      { label: "Kalkulator Umroh", target: "kalkulator-umroh", icon: Calculator },
      { label: "Cari Tiket", target: "tiket", icon: Ticket },
      { label: "Cari Hotel", target: "hotel", icon: Hotel },
    ];

  const handleAction = (target: string, label: string) => {
    if (onAction) {
      onAction(target, label);
      return;
    }

    router.push(getFeatureRoute(target, `/${target}`));
  };

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
              <p className="post-auth-brand-tagline">
                Asisten virtual yang siap membantu dan menjadikan umroh Anda semudah pulang kampung
              </p>
            </div>

            <div className="post-auth-intro">
              <p className="post-auth-intro-title">
                Bapak/Ibu {visitorName}, Semoga Ibadah Umroh Anda
              </p>
              <p className="post-auth-intro-subtitle">Mabrur dan diterima di sisi Allah SWT.</p>
            </div>
          </div>
        </section>

        <div className="post-auth-surface">
          <div className="post-auth-card p-3">
            {surfaceContent ?? (
              <>
                <div className="px-2 pb-4 pt-1 text-center">
                  <p className="dashboard-chip-label">{sectionTitle ?? title ?? eyebrow}</p>
                  <p className="dashboard-chip-copy">{sectionDescription ?? description}</p>
                </div>

                <div className={`post-auth-action-grid ${headerActions.length === 3 ? "post-auth-action-grid-center" : ""}`}>
                  {headerActions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleAction(item.target, item.label)}
                        className="post-auth-action-button"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
        {children}
        <PostAuthFooter />
      </main>
      {showCalculatorCart ? <SharedCalculatorCart /> : null}
    </>
  );
}
