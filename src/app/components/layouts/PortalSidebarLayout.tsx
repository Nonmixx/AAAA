'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, LogOut, Menu, type LucideIcon } from 'lucide-react';
import { cn } from '../ui/utils';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface PortalSidebarItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

interface PortalSidebarLayoutProps {
  children: ReactNode;
  portalLabel: string;
  navigation: PortalSidebarItem[];
  homeHref: string;
  logoutHref: string;
  headerRight?: ReactNode;
}

export function PortalSidebarLayout({
  children,
  portalLabel,
  navigation,
  homeHref,
  logoutHref,
  headerRight,
}: PortalSidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Default to hidden only on /donor/dashboard, otherwise use stored preference or default open
    const stored = localStorage.getItem('sidebarOpen');
    const defaultOpen = pathname !== '/donor/dashboard' && (stored === null ? true : stored === 'true');
    setSidebarOpen(defaultOpen);
  }, [pathname]);

  useEffect(() => {
    // Save sidebar state to localStorage, but only if not on dashboard
    if (pathname !== '/donor/dashboard') {
      localStorage.setItem('sidebarOpen', sidebarOpen.toString());
    }
  }, [sidebarOpen, pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length <= 1) {
      return pathname === path;
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const handleNavClick = () => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();

      // Defensive cleanup in case a stale browser auth key survives navigation.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : null;
      if (projectRef) {
        window.localStorage.removeItem(`sb-${projectRef}-auth-token`);
        window.sessionStorage.removeItem(`sb-${projectRef}-auth-token`);
      }
    } finally {
      handleNavClick();
      router.replace(logoutHref);
      router.refresh();
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf2f4] bg-opacity-30">
      <header
        className={cn(
          'sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#000000] shadow-lg transition-[padding-left] duration-200',
          sidebarOpen && 'md:pl-72',
        )}
      >
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <div className="group relative">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#da1a32]/40"
              aria-label={sidebarOpen ? 'Hide menu' : 'Show menu'}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-white px-2.5 py-1 text-xs font-medium text-[#000000] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {sidebarOpen ? 'Hide menu' : 'Show menu'}
            </span>
          </div>

          <Link href={homeHref} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#da1a32] shadow-sm">
              <Heart className="h-6 w-6 text-white" fill="white" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">DonateAI</div>
              <div className="text-xs text-white/70">{portalLabel}</div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">{headerRight}</div>
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 top-16 z-30 bg-black/40 md:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-72 overflow-y-auto border-r border-[#1f1f1f] bg-[#000000] text-white shadow-2xl transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-6 py-5">
            <p className="text-sm font-medium text-white/65">{portalLabel}</p>
          </div>

          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors',
                      active
                        ? 'bg-[#da1a32] font-medium text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-[#ff8b99] transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className={cn('transition-[padding-left] duration-200', sidebarOpen && 'md:pl-72')}>
        {children}
      </main>
    </div>
  );
}
