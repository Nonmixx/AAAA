'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, LayoutDashboard, Plus, Inbox, User, LogOut, Menu, Bell, X, Truck, Package, CheckCircle2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentReceiverContext } from '@/lib/supabase/receiver';

interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFS: Notification[] = [
  { id: '1', title: 'New Allocation Incoming', desc: 'Food Packs (60 units) from Sarah Johnson — AI matched', time: '30 min ago', read: false },
  { id: '2', title: 'Delivery In Transit', desc: 'Blankets from Lisa Wong are on the way — est. Apr 21', time: '2 hrs ago', read: false },
  { id: '3', title: '✅ Delivered', desc: 'School Supplies from Michael Chen have been delivered', time: '1 day ago', read: true },
];

export function ReceiverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const navigation = [
    { name: 'Dashboard', path: '/receiver', icon: LayoutDashboard },
    { name: 'Create Need', path: '/receiver/create-needs', icon: Plus },
    { name: 'Incoming', path: '/receiver/incoming', icon: Inbox },
    { name: 'Profile', path: '/receiver/profile', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/receiver') return pathname === path;
    return pathname.startsWith(path);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    const validateReceiverAccess = async () => {
      try {
        await getCurrentReceiverContext();
        if (isMounted) {
          setAuthReady(true);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : '';
          router.replace(message.includes('No organization found') ? '/receiver-verification' : '/login');
        }
      }
    };

    void validateReceiverAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const dismissNotif = (id: string) => setNotifs((prev) => prev.filter((n) => n.id !== id));

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/login');
  };

  const NOTIF_ICON = (n: Notification) => {
    if (n.title.includes('Allocation') || n.title.includes('New')) return <Package className="w-3.5 h-3.5" />;
    if (n.title.includes('Transit')) return <Truck className="w-3.5 h-3.5" />;
    return <CheckCircle2 className="w-3.5 h-3.5" />;
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edf2f4] bg-opacity-10 text-sm text-gray-500">
        Loading receiver portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf2f4] bg-opacity-10">
      <nav className="bg-[#000000] border-b border-[#e5e5e5] sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/receiver" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#da1a32] rounded-lg flex items-center justify-center shadow-sm">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <div>
                <div className="text-lg text-white font-bold">DonateAI</div>
                <div className="text-xs text-white opacity-70">Receiver Portal</div>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen((p) => !p); setMenuOpen(false); }}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${notifOpen ? 'opacity-70 text-white' : 'text-white hover:opacity-70'}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[#da1a32] rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-[#edf2f4] overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#edf2f4]">
                      <h3 className="font-bold text-[#000000] text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-[#da1a32] hover:text-[#b01528] font-medium">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-[#edf2f4] last:border-b-0 ${n.read ? '' : 'bg-[#edf2f4] bg-opacity-60'}`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-[#da1a32]'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${n.read ? 'text-gray-600' : 'text-[#000000]'}`}>{n.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.desc}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                          </div>
                          <button onClick={() => dismissNotif(n.id)} className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {notifs.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* More Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => { setMenuOpen((p) => !p); setNotifOpen(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${menuOpen ? 'opacity-70 text-white' : 'text-white hover:opacity-70'}`}
                >
                  <Menu className="w-5 h-5" />
                  <span>More</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-[#edf2f4] overflow-hidden z-50">
                    <div className="py-2 border-b border-[#edf2f4]">
                      {navigation.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${active ? 'bg-[#da1a32] text-white font-medium' : 'text-[#000000] hover:bg-[#edf2f4]'}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.name}</span>
                            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                          </Link>
                        );
                      })}
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => void handleLogout()}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#da1a32] hover:bg-[#edf2f4] transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {children}
      </main>
    </div>
  );
}
