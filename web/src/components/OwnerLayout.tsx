import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Home, PawPrint, QrCode } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/BrandLockup";
import { useOwnerSession } from "@/lib/owner-auth";
import { getInitials } from "@/lib/format";

export default function OwnerLayout({
  children,
  title,
  titleHref = "/owner/pets",
  subtitle,
  action,
  headerStart,
  headerEnd,
}: {
  children: ReactNode;
  title?: string;
  titleHref?: string | null;
  subtitle?: string;
  action?: ReactNode;
  headerStart?: ReactNode;
  headerEnd?: ReactNode;
}) {
  const location = useLocation();
  const { pathname } = location;
  const { user } = useOwnerSession();
  const mainRef = useRef<HTMLElement | null>(null);
  const tabs = [
    { to: "/owner/home", label: "Home", icon: Home },
    { to: "/owner/pets", label: "Pets", icon: PawPrint },
    { to: "/owner/share", label: "Share", icon: QrCode },
    { to: "/owner/account", label: "Account", initials: getInitials(user?.fullName ?? "Owner") },
  ];

  const headerTitle = title ?? (
    <>
      <BrandMark className="size-7 shadow-none" />
      <BrandWordmark compact className="text-lg" />
    </>
  );

  const isActive = (to: string) => {
    if (to === "/owner/home") {
      return pathname === "/owner" || pathname === "/owner/home";
    }

    if (to === "/owner/pets") {
      return pathname === "/owner/pets" || pathname.startsWith("/owner/pets/");
    }

    return pathname === to || pathname.startsWith(`${to}/`);
  };

  useEffect(() => {
    const node = mainRef.current;
    if (!node) {
      return;
    }

    if (typeof node.scrollTo === "function") {
      node.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    node.scrollTop = 0;
  }, [pathname]);

  return (
    <div className="app-shell">
      <div className="app-canvas">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="grid h-16 grid-cols-[2.5rem_1fr_2.5rem] items-center px-5">
            <div className="flex size-10 items-center justify-center">{headerStart ?? <span className="size-10" />}</div>
            {titleHref === null ? (
              <div className="flex items-center justify-center gap-2 font-display text-lg font-bold text-primary">
                {headerTitle}
              </div>
            ) : (
              <Link to={titleHref} className="flex items-center justify-center gap-2 font-display text-lg font-bold text-primary">
                {headerTitle}
              </Link>
            )}
            <div className="flex size-10 items-center justify-center">{headerEnd ?? <span className="size-10" />}</div>
          </div>

          {(subtitle || action) ? (
            <div className="px-5 pb-4">
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
              {action ? <div className="mt-3">{action}</div> : null}
            </div>
          ) : null}
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto pb-24 pt-4">{children}</main>

        <nav className="sticky bottom-0 left-0 right-0 z-20 border-t border-border/60 bg-card/95 backdrop-blur-md">
          <div className="grid grid-cols-4 gap-1 px-2 py-2">
            {tabs.map((tab) => {
              const active = isActive(tab.to);
              const Icon = tab.icon;

              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors"
                >
                  <span
                    className={`flex items-center justify-center rounded-full px-5 py-1.5 transition-all ${
                      active ? "bg-primary-soft text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {Icon ? (
                      <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                    ) : (
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {tab.initials}
                      </span>
                    )}
                  </span>
                  <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {tab.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
