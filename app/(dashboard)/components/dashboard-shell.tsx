"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";
import type { Role } from "@/src/lib/types";

interface DashboardShellProps {
  children: React.ReactNode;
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string; slug: string; role: Role };
  role: Role;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊", roles: ["owner", "manager", "supervisor", "operator", "viewer"] },
  { name: "Kandang", href: "/coops", icon: "🏠", roles: ["owner", "manager", "supervisor", "operator", "viewer"] },
  { name: "Recording", href: "/recording", icon: "📋", roles: ["owner", "manager", "supervisor", "operator"] },
  { name: "Performa", href: "/performance", icon: "📈", roles: ["owner", "manager", "supervisor", "viewer"] },
  { name: "Anggota", href: "/members", icon: "👥", roles: ["owner", "manager"] },
  { name: "Notifikasi", href: "/notifications", icon: "🔔", roles: ["owner", "manager", "supervisor", "operator", "viewer"] },
  { name: "Pengaturan", href: "/settings", icon: "⚙️", roles: ["owner"] },
];

// Simplified mobile bottom nav for owner (summary-focused)
const ownerMobileNav = [
  { name: "Beranda", href: "/dashboard", icon: "📊" },
  { name: "Kandang", href: "/coops", icon: "🏠" },
  { name: "Performa", href: "/performance", icon: "📈" },
  { name: "Notifikasi", href: "/notifications", icon: "🔔" },
];

export function DashboardShell({ children, user, organization, role }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navigation.filter((item) => item.roles.includes(role));
  const isOwnerOrManager = role === "owner" || role === "manager";

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-gradient-primary-vertical text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <img src="/icon/favicon.svg" alt="Logo" className="h-8 w-8" />
          <h2 className="text-lg font-bold truncate">{organization.name}</h2>
        </div>
        <Badge variant="secondary" className="mt-1 capitalize bg-white/20 text-white border-0 hover:bg-white/30">
          {role}
        </Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-2">
          <p className="text-sm font-medium truncate text-white">{user.name}</p>
          <p className="text-xs text-white/60 truncate">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" className="w-full rounded-xl bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white" onClick={handleLogout}>
          Keluar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 md:block shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header (owner/manager) */}
      {isOwnerOrManager && (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/90 backdrop-blur-sm px-4 md:hidden">
          <div className="flex items-center gap-2">
            <img src="/icon/favicon.svg" alt="Logo" className="h-7 w-7" />
            <span className="font-semibold text-sm truncate max-w-[140px]">{organization.name}</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted" aria-label="Menu">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0" aria-label="Menu navigasi">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>
      )}

      {/* Mobile Header (non-owner) */}
      {!isOwnerOrManager && (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/90 backdrop-blur-sm px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-muted" aria-label="Menu">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0" aria-label="Menu navigasi">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-sm">{organization.name}</span>
          <div className="w-8" />
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-3 md:p-6 lg:p-8 pb-20 md:pb-6">{children}</div>
      </main>

      {/* Mobile Bottom Nav (owner/manager only) */}
      {isOwnerOrManager && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur-sm safe-bottom md:hidden">
          <div className="flex items-center justify-around h-14">
            {ownerMobileNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
