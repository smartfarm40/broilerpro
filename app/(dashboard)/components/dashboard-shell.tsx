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

export function DashboardShell({ children, user, organization, role }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navigation.filter((item) => item.roles.includes(role));

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
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="fixed left-4 top-4 z-50 md:hidden"
          >
            ☰
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
