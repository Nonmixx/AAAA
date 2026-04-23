'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Heart, LayoutDashboard, Sparkles, Search, MapPin, User,
  LogOut, Menu, Bell, Zap, Settings, X,
} from 'lucide-react';
import { useDonorContext } from '../../context/DonorContext';

interface Notification {
  id: string;
  title: string;
  desc: string;
  /** Extra context shown when the row is expanded. */
  details: string;
  time: string;
  read: boolean;
  type: 'allocation' | 'delivery' | 'proof' | 'emergency';
}

const INITIAL_NOTIFS: Notification[] = [
  {
    id: '1',
    title: 'Allocation Completed',
    desc: 'DON-003 has been allocated to Hope Orphanage & Sunshine Home',
    details:
      'Split: 60% Hope Orphanage (primary intake), 40% Sunshine Home (overflow shelter). Next step: each receiver confirms pickup window. You can adjust allocation from Tracking until dispatch is locked.',
    time: '2 min ago',
    read: false,
    type: 'allocation',
  },
  {
    id: '2',
    title: 'Delivery Scheduled',
    desc: 'DON-002 Blankets delivery is confirmed for Apr 21',
    details:
      'Courier reference CR-8821-A. Pickup Apr 21, 09:00–12:00 from your saved address. Bring donation ID DON-002; driver may request a quick photo at handoff.',
    time: '1 hr ago',
    read: false,
    type: 'delivery',
  },
  {
    id: '3',
    title: 'Proof of Delivery Available',
    desc: 'DON-001 Food Packs — proof uploaded by Hope Orphanage',
    details:
      'Signed handoff sheet and warehouse photo are attached to this donation. Download from Tracking → DON-001 → Documents. If anything looks wrong, open a dispute within 7 days.',
    time: '2 days ago',
    read: false,
    type: 'proof',
  },
  {
    id: '4',
    title: 'Item Delivered',
    desc: 'DON-001 Food Packs has been successfully delivered',
    details:
      'Receiver confirmed quantity and condition as received. Thank-you note is available in your donor inbox. This donation is now closed.',
    time: '2 days ago',
    read: true,
    type: 'delivery',
  },
  {
    id: '5',
    title: '🚨 Emergency Mode Activated',
    desc: 'System switched to Emergency Mode due to urgent needs',
    details:
      'Matching and browse views now prioritise organisations flagged with active emergencies. You can turn Emergency Mode off anytime in Settings.',
    time: '3 days ago',
    read: true,
    type: 'emergency',
  },
];

const NOTIF_COLORS: Record<Notification['type'], string> = {
  allocation: 'bg-blue-50 text-blue-600',
  delivery: 'bg-green-50 text-green-600',
  proof: 'bg-purple-50 text-purple-600',
  emergency: 'bg-red-50 text-[#da1a32]',
};

export function DonorAuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { emergencyMode } = useDonorContext();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const navigation = [
    { name: 'Dashboard', path: '/donor/dashboard', icon: LayoutDashboard },
    { name: 'AI Donate', path: '/donor/donate', icon: Sparkles },
    { name: 'Browse Needs', path: '/donor/needs', icon: Search },
    { name: 'Track', path: '/donor/tracking', icon: MapPin },
    { name: 'Profile', path: '/donor/profile', icon: User },
    { name: 'Settings', path: '/donor/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/donor/dashboard') return pathname === path;
    return pathname.startsWith(path);
  };

  // Close dropdowns when clicking outside
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
    if (!notifOpen) setExpandedNotifId(null);
  }, [notifOpen]);

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const markOneRead = (id: string) => setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const dismissNotif = (id: string) => {
    setExpandedNotifId((cur) => (cur === id ? null : cur));
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#edf2f4] bg-opacity-30">

      {/* Emergency Mode System Banner */}
      {emergencyMode && (
        <div className="bg-[#da1a32] text-white text-center py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-sm">
          <Zap className="w-4 h-4" />
          🚨 System is currently in Emergency Mode — Urgent needs are prioritised
          <Zap className="w-4 h-4" />
        </div>
      )}

      {/* Nav */}
      <nav className="bg-[#000000] sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/donor/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#da1a32] rounded-lg flex items-center justify-center shadow-sm">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <div>
                <div className="text-lg text-white font-bold">DonateAI</div>
                <div className="text-xs text-white opacity-70">Donor Portal</div>
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
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.map((n) => {
                        const expanded = expandedNotifId === n.id;
                        return (
                          <div
                            key={n.id}
                            className={`border-b border-[#edf2f4] last:border-b-0 transition-colors ${n.read ? '' : 'bg-[#edf2f4] bg-opacity-50'}`}
                          >
                            <div className="flex items-start gap-3 px-4 py-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-[#da1a32]'}`} />
                              <div className="flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setExpandedNotifId((cur) => (cur === n.id ? null : n.id))}
                                  className="w-full text-left rounded-lg -m-1 p-1 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#da1a32]/40"
                                >
                                  <p className={`text-xs font-medium ${n.read ? 'text-gray-600' : 'text-[#000000]'}`}>{n.title}</p>
                                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.desc}</p>
                                  <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                                  <p className="text-[10px] text-[#da1a32] font-medium mt-1">{expanded ? 'Hide details' : 'Show details'}</p>
                                </button>
                                {expanded ? (
                                  <div className="mt-2 pt-2 border-t border-[#edf2f4] space-y-2">
                                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-md ${NOTIF_COLORS[n.type]}`}>
                                      {n.type === 'allocation'
                                        ? 'Allocation'
                                        : n.type === 'delivery'
                                          ? 'Delivery'
                                          : n.type === 'proof'
                                            ? 'Proof'
                                            : 'System'}
                                    </span>
                                    <p className="text-xs text-gray-600 leading-relaxed">{n.details}</p>
                                    {!n.read ? (
                                      <button
                                        type="button"
                                        onClick={() => markOneRead(n.id)}
                                        className="inline-flex items-center justify-center rounded-lg border border-[#da1a32] bg-white px-3 py-1.5 text-xs font-semibold text-[#da1a32] shadow-sm transition-colors hover:bg-[#da1a32] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#da1a32] focus-visible:ring-offset-1"
                                      >
                                        Mark as read
                                      </button>
                                    ) : (
                                      <span className="text-[10px] font-medium text-gray-400">Read</span>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissNotif(n.id);
                                }}
                                className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5 p-1 rounded-md hover:bg-black/5"
                                aria-label="Dismiss notification"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
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

                {/* More Dropdown */}
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
                        onClick={() => { setMenuOpen(false); router.push('/donor'); }}
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
