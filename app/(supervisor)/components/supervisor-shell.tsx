"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";

interface SupervisorShellProps {
  children: React.ReactNode;
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string; slug: string };
}

const supervisorNav = [
  {
    name: "Beranda",
    href: "/supervisor",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    name: "Check-in",
    href: "/supervisor/checkin",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    name: "Performa",
    href: "/supervisor/performa",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
  {
    name: "Recording",
    href: "/supervisor/recording",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    name: "Jadwal Obat",
    href: "/supervisor/jadwal",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
  },
  {
    name: "Log Aktivitas",
    href: "/supervisor/log",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
];

export function SupervisorShell({ children, user, organization }: SupervisorShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/80 backdrop-blur-sm px-4">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <button className="flex items-center gap-2" aria-label="Menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-full flex-col bg-gradient-primary-vertical text-white">
              {/* Sidebar Header */}
              <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
                <img src="/icon/favicon.svg" alt="Logo" className="h-10 w-10" />
                <div>
                  <h2 className="text-base font-bold leading-tight">{organization.name}</h2>
                  <p className="text-xs text-white/60">Supervisor Panel</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 px-3 py-4">
                {supervisorNav.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-white/20 text-white shadow-sm"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="border-t border-white/10 px-4 py-4">
                <div className="mb-3 px-1">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-white/50">{user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl bg-white/10 border-white/20 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                  onClick={handleLogout}
                >
                  Keluar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <img src="/icon/favicon.svg" alt="Logo" className="h-7 w-7" />
          <span className="text-sm font-bold text-gradient-primary">Supervisor</span>
        </div>

        <div className="w-6" />
      </header>

      {/* Main Content */}
      <main className="flex-1 px-3 py-3 md:px-6 md:py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
