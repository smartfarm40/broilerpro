"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";

interface OperatorShellProps {
  children: React.ReactNode;
  user: { id: string; name: string; email: string };
  organization: { id: string; name: string; slug: string };
}

const operatorNav = [
  {
    name: "Deplesi",
    href: "/operator/deplesi",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    name: "Pakan",
    href: "/operator/pakan",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h20" />
        <path d="M6 12v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" />
        <path d="m4 8 2 4" />
        <path d="m20 8-2 4" />
        <path d="M12 4v8" />
      </svg>
    ),
  },
  {
    name: "Jadwal",
    href: "/operator/jadwal",
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
    name: "Timbang",
    href: "/operator/timbang",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v17" />
        <path d="M5 10h14" />
        <path d="m5 10 3 7" />
        <path d="m19 10-3 7" />
        <circle cx="8" cy="17" r="2" />
        <circle cx="16" cy="17" r="2" />
      </svg>
    ),
  },
  {
    name: "Panen",
    href: "/operator/panen",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5Z" />
        <path d="m2 17 10 5 10-5" />
        <path d="m2 12 10 5 10-5" />
      </svg>
    ),
  },
];

export function OperatorShell({ children, user, organization }: OperatorShellProps) {
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
      {/* Top Header - minimal */}
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
                  <p className="text-xs text-white/60">Operator Panel</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 px-3 py-4">
                {operatorNav.map((item) => {
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  Keluar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <img src="/icon/favicon.svg" alt="Logo" className="h-7 w-7" />
          <span className="text-sm font-bold text-gradient-primary">Broiler Monitor</span>
        </div>

        <div className="w-6" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-3 py-3 md:px-6 md:py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
