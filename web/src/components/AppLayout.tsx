import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { CalendarDays, Home, Link2, PawPrint, Plus, Stethoscope } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/BrandLockup";
import { useSession } from "@/lib/auth";
import { getInitials } from "@/lib/format";
import { getNavigationSource } from "@/lib/navigation";

interface AppLayoutProps {
  children: ReactNode;
  showChrome?: boolean;
  title?: ReactNode;
  titleHref?: string | null;
  headerStart?: ReactNode;
  headerEnd?: ReactNode;
  footer?: ReactNode;
  scrollContent?: boolean;
}

export default function AppLayout({
  children,
  showChrome = true,
  title,
  titleHref = "/home",
  headerStart,
  headerEnd,
  footer,
  scrollContent = true,
}: AppLayoutProps) {
  const location = useLocation();
  const { pathname, search, state } = location;
  const { user } = useSession();
  const [addOpen, setAddOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const navigationSource = getNavigationSource({ pathname, search, state });
  const tabs = [
    { type: "link" as const, to: "/home", label: "Home", icon: Home },
    { type: "link" as const, to: "/pets", label: "Pets", icon: PawPrint },
    { type: "action" as const, key: "add", label: "Add", icon: Plus },
    { type: "link" as const, to: "/calendar", label: "Calendar", icon: CalendarDays },
    { type: "link" as const, to: "/account", label: "Account", initials: getInitials(user?.fullName ?? "VetCard") },
  ];
  const isActive = (to: string) => {
    if (to === "/home") {
      return pathname === "/" || pathname === "/home";
    }

    if (to === "/pets") {
      return pathname === "/pets" || pathname.startsWith("/pets");
    }

    if (to === "/calendar") {
      return pathname === "/calendar" || pathname.startsWith("/appointments");
    }

    if (to === "/account") {
      return pathname === "/account" || pathname.startsWith("/account/");
    }

    return pathname === to;
  };

  useEffect(() => {
    setAddOpen(false);
  }, [pathname]);

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

  const headerTitle = title ?? (
    <>
      <BrandMark className="size-7 rounded-[0.8rem] shadow-none" />
      <BrandWordmark compact className="text-lg" />
    </>
  );

  return (
    <div className="app-shell">
      <div className={`app-canvas ${scrollContent ? "" : "h-[100dvh] min-h-0 overflow-hidden"}`}>
        {showChrome && (
          <header className="sticky top-0 z-20 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-5 h-16 bg-background/85 backdrop-blur-md border-b border-border/60">
            <div className="flex size-10 items-center justify-center">{headerStart ?? <span className="size-10" />}</div>
            {titleHref === null ? (
              <div className="flex items-center justify-center gap-2 font-display font-bold text-primary text-lg">{headerTitle}</div>
            ) : (
              <Link to={titleHref} className="flex items-center justify-center gap-2 font-display font-bold text-primary text-lg">
                {headerTitle}
              </Link>
            )}
            <div className="flex size-10 items-center justify-center">{headerEnd ?? <span className="size-10" />}</div>
          </header>
        )}

        <main
          ref={mainRef}
          className={`flex-1 min-h-0 ${
            scrollContent ? `overflow-y-auto ${showChrome ? "pb-24" : ""}` : ""
          }`}
        >
          {children}
        </main>

        {footer}

        {showChrome && addOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 bg-foreground/10 backdrop-blur-[1px]"
              onClick={() => setAddOpen(false)}
              aria-label="Close quick add"
            />
            <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 mx-auto w-full max-w-[440px] px-4">
              <div className="rounded-[1.75rem] border border-border/70 bg-card p-4 shadow-float">
                <div className="mb-3">
                  <h2 className="font-display text-lg font-bold">Quick Add</h2>
                  <p className="text-sm text-muted-foreground">Create, link, or schedule from here.</p>
                </div>
                <div className="space-y-2">
                  <Link
                    to="/pets/new"
                    state={{ from: navigationSource }}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <PawPrint className="size-5" />
                    </span>
                    <span className="text-sm font-semibold">New Pet Profile</span>
                  </Link>
                  <Link
                    to="/pets/link"
                    state={{ from: navigationSource }}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <Link2 className="size-5" />
                    </span>
                    <span className="text-sm font-semibold">Link Pet Profile</span>
                  </Link>
                  <Link
                    to="/appointments/new"
                    state={{ from: navigationSource }}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                      <Stethoscope className="size-5" />
                    </span>
                    <span className="text-sm font-semibold">Add Appointment</span>
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {showChrome && (
          <nav className="sticky bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-md border-t border-border/60">
            <div className="grid grid-cols-5 gap-1 px-2 py-2">
              {tabs.map((tab) => {
                if (tab.type === "action") {
                  const Icon = tab.icon;
                  const active = addOpen;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setAddOpen((current) => !current)}
                      className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors"
                    >
                      <span
                        className={`flex items-center justify-center rounded-full px-5 py-1.5 transition-all ${
                          active ? "bg-primary-soft text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                      </span>
                      <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                        {tab.label}
                      </span>
                    </button>
                  );
                }

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
        )}
      </div>
    </div>
  );
}
