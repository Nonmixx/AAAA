'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, LayoutDashboard, Plus, Inbox, User, LogOut, Menu, Bell, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  desc: string;
  details: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFS: Notification[] = [
  {
    id: '1',
    title: 'New Allocation Incoming',
    desc: 'Food Packs (60 units) from Sarah Johnson — AI matched',
    details:
      'Donation ID DON-1048. Suggested split reviewed by AI: your food program (primary) vs overflow pantry. Accept or request re-balance within 48 hours. Donor contact is masked until you confirm.',
    time: '30 min ago',
    read: false,
  },
  {
    id: '2',
    title: 'Delivery In Transit',
    desc: 'Blankets from Lisa Wong are on the way — est. Apr 21',
    details:
      'Carrier: Metro Logistics. Tracking ML-2291. ETA Apr 21 14:00–16:00. Receiving dock B — have staff ready to sign POD. Cold chain not required for this SKU.',
    time: '2 hrs ago',
    read: false,
  },
  {
    id: '3',
    title: '✅ Delivered',
    desc: 'School Supplies from Michael Chen have been delivered',
    details:
      'POD uploaded and donor notified automatically. Inventory updated: +45 kits in “School Supplies”. No open actions on this shipment.',
    time: '1 day ago',
    read: true,
  },
];

export function ReceiverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
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
    if (!notifOpen) setExpandedNotifId(null);
  }, [notifOpen]);

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const markOneRead = (id: string) => setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const dismissNotif = (id: string) => {
    setExpandedNotifId((cur) => (cur === id ? null : cur));
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

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
                      {notifs.map((n) => {
                        const expanded = expandedNotifId === n.id;
                        return (
                          <div
                            key={n.id}
                            className={`border-b border-[#edf2f4] last:border-b-0 ${n.read ? '' : 'bg-[#edf2f4] bg-opacity-60'}`}
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
                        onClick={() => { setMenuOpen(false); router.push('/'); }}
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
