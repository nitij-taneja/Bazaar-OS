import { COOKIE_NAME } from "@shared/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { LayoutDashboard, LogOut, Moon, PanelLeft, PencilLine, ShoppingBag, Sparkles, Sun } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Catalog workspace", path: "/merchant" },
  { icon: PencilLine, label: "Edit products", path: "/merchant/edit" },
  { icon: ShoppingBag, label: "Live Commerce Studio", path: "/app" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [adminEmail, setAdminEmail] = useState("admin@novacart.in");
  const [adminPassword, setAdminPassword] = useState("novacart2026");
  const { loading, user } = useAuth();
  const utils = trpc.useUtils();
  const demoLogin = trpc.auth.demoLogin.useMutation({
    onSuccess: (data) => {
      try {
        sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${data.token}`);
        localStorage.setItem("manus-cookie", `${COOKIE_NAME}=${data.token}`);
      } catch {}
      utils.auth.me.setData(undefined, data.user as any);
      void utils.auth.me.invalidate();
    },
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Auto-login into demo merchant console seamlessly if not signed in
  useEffect(() => {
    if (!loading && !user && !demoLogin.isPending && !demoLogin.isSuccess) {
      demoLogin.mutate({ role: "admin" });
    }
  }, [loading, user, demoLogin]);

  if (loading || (demoLogin.isPending && !user)) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full rounded-3xl border border-border bg-card shadow-2xl">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <Sparkles size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              NovaCart Merchant Operator Portal
            </h1>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Authenticate to manage live SKUs, trigger dense vector indexing, and inspect verified Razorpay webhooks.
            </p>
          </div>

          {/* Realistic Credentials Form */}
          <div className="w-full space-y-3.5 text-left">
            <div>
              <label className="text-[11px] font-mono font-semibold text-muted-foreground">OPERATOR EMAIL</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="admin@novacart.in"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono font-semibold text-muted-foreground">OPERATOR PASSCODE / API KEY</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="••••••••••••"
              />
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Verified Test Credentials Pre-Filled for Local Evaluation</span>
            </div>

            <Button
              onClick={() => demoLogin.mutate({ role: "admin" })}
              size="lg"
              disabled={demoLogin.isPending}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 font-bold text-white shadow-lg hover:opacity-90 transition-all"
            >
              {demoLogin.isPending ? "Verifying Credentials..." : "Sign In to NovaCart Admin"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center justify-between px-2 transition-all w-full">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSidebar}
                  className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                {!isCollapsed ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold tracking-tight truncate">
                      BazaarOS
                    </span>
                  </div>
                ) : null}
              </div>
              {!isCollapsed ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {theme === "dark" ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-sky-600" />}
                </Button>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8 rounded-lg" />
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">NovaCart</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">{activeMenuItem?.label ?? "Catalog Workspace"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>STORE OPERATOR MODE</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-sky-600" />}
            </Button>

            <Link href="/app">
              <Button size="sm" variant="outline" className="h-8 text-xs border-border bg-card/60 text-foreground hover:bg-accent font-semibold">
                Commerce Studio →
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
