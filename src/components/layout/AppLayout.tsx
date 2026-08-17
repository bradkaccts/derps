import { ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { MessageCircle, Heart, User, PawPrint, PlusCircle, ClipboardList, Inbox, HeartHandshake, MapPin, LifeBuoy, History, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMessaging } from "@/context/MessagingContext";
import { useMatches } from "@/context/playdates/PlaydatesProvider";
import { FEATURES } from "@/config/features";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/playdates", label: "Derpdates", icon: HeartHandshake },
  { path: "/discover", label: "Discover", icon: Compass },
  { path: "/inbox", label: "Inbox", icon: MessageCircle },
  { path: "/my-derps", label: "My Derp Friends", icon: Heart },
  { path: "/profile", label: "Profile", icon: User },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { totalUnread } = useMessaging();
  const { awaitingReplyCount } = useMatches();

  const badgeFor = (path: string) => {
    if (path === "/inbox") return totalUnread;
    if (path === "/playdates") return awaitingReplyCount;
    return 0;
  };

  const isNavActive = (path: string) =>
    path === "/playdates"
      ? location.pathname === "/" || location.pathname.startsWith("/playdates")
      : location.pathname === path;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar p-4">
          <Link to="/" className="flex items-center gap-2 px-3 py-4 mb-6">
            <PawPrint className="h-8 w-8 text-primary" />
            <span className="text-2xl font-extrabold text-foreground tracking-tight">
              Derps
            </span>
          </Link>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = isNavActive(item.path);
              const badge = badgeFor(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  {badge > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold animate-wag">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
            </nav>

            {FEATURES.adoption && (
              <div className="mt-4 space-y-2">
                <Button asChild variant="outline" className="w-full gap-2 font-semibold justify-start">
                  <Link to="/my-applications">
                    <ClipboardList className="h-4 w-4" />
                    My Applications
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full gap-2 font-semibold justify-start">
                  <Link to="/applications-inbox">
                    <Inbox className="h-4 w-4" />
                    Applicant Inbox
                  </Link>
                </Button>
              </div>
            )}

            {/* Derpdates sub-surfaces */}
            <div className="mt-4 space-y-2">
              <Button asChild variant="outline" className="w-full gap-2 font-semibold justify-start">
                <Link to="/playdates/venues">
                  <MapPin className="h-4 w-4" />
                  Places to Meet
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full gap-2 font-semibold justify-start">
                <Link to="/playdates/history">
                  <History className="h-4 w-4" />
                  Swipe History
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full gap-2 font-semibold justify-start">
                <Link to="/playdates/safety">
                  <LifeBuoy className="h-4 w-4" />
                  Safety Center
                </Link>
              </Button>
            </div>


            {FEATURES.adoption && (
              <div className="mt-auto pt-4">
                <Button asChild className="w-full gap-2 font-bold">
                  <Link to="/create-listing">
                    <PlusCircle className="h-4 w-4" />
                    Rehome a Derp
                  </Link>
                </Button>
              </div>
            )}
          </aside>
        )}

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile Bottom Tab Bar */}
      {isMobile && (
        <>
          {/* Floating Rehome Button */}
          {FEATURES.adoption && (
            <Link
              to="/create-listing"
              className="fixed bottom-[72px] right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
            >
              <PlusCircle className="h-6 w-6" />
            </Link>
          )}
          <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card py-2 safe-bottom">
            {navItems.map((item) => {
              const isActive = isNavActive(item.path);
              const badge = badgeFor(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative flex min-h-[44px] flex-col items-center gap-0.5 px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div className="relative">
                    <item.icon className={cn("h-5 w-5", isActive && "animate-wag")} />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold animate-wag">
                        {badge}
                      </span>
                    )}
                  </div>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
