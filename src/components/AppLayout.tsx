import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Calendar, LayoutDashboard, MessageCircle, Settings, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function AppLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
        <div className="px-6 py-7 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gradient-gold flex items-center justify-center text-sidebar-primary-foreground font-display text-xl font-semibold shadow-gold">
              BB
            </div>
            <div className="leading-tight">
              <p className="font-display text-lg">BG Studio</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">Beauty</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-gold font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-5 border-t border-sidebar-border text-[11px] text-sidebar-foreground/40 tracking-wide">
          v1.0 · Vigo, Galicia
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-0">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-6 md:py-10 animate-fade-in" key={loc.pathname}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar border-t border-sidebar-border">
        <div className="grid grid-cols-6">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition-colors",
                  isActive ? "text-primary" : "text-sidebar-foreground/60"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn("p-1.5 rounded-lg transition-all", isActive && "bg-primary/15")}>
                    <item.icon className="h-[18px] w-[18px]" />
                  </div>
                  <span className="leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
