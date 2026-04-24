'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, LayoutDashboard, Plus, Inbox, User, X, Waves } from 'lucide-react';
import {
  PortalSidebarLayout,
  type PortalSidebarItem,
} from './PortalSidebarLayout';

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
    desc: 'Food Packs (60 units) from Sarah Johnson - AI matched',
    details:
      'Donation ID DON-1048. Suggested split reviewed by AI: your food program (primary) vs overflow pantry. Accept or request re-balance within 48 hours. Donor contact is masked until you confirm.',
    time: '30 min ago',
    read: false,
  },
  {
    id: '2',
    title: 'Delivery In Transit',
    desc: 'Blankets from Lisa Wong are on the way - est. Apr 21',
    details:
      'Carrier: Metro Logistics. Tracking ML-2291. ETA Apr 21 14:00-16:00. Receiving dock B - have staff ready to sign POD. Cold chain not required for this SKU.',
    time: '2 hrs ago',
    read: false,
  },
  {
    id: '3',
    title: 'Delivered',
    desc: 'School Supplies from Michael Chen have been delivered',
    details:
      'POD uploaded and donor notified automatically. Inventory updated: +45 kits in "School Supplies". No open actions on this shipment.',
    time: '1 day ago',
    read: true,
  },
];

export function ReceiverLayout({ children }: { children: React.ReactNode }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const navigation: PortalSidebarItem[] = [
    { name: 'Dashboard', path: '/receiver', icon: LayoutDashboard },
    { name: 'Disaster Ops', path: '/receiver/disaster-ops', icon: Waves },
    { name: 'Create Need', path: '/receiver/create-needs', icon: Plus },
    { name: 'Incoming', path: '/receiver/incoming', icon: Inbox },
    { name: 'Profile', path: '/receiver/profile', icon: User },
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    <PortalSidebarLayout
      portalLabel="Receiver Portal"
      navigation={navigation}
      homeHref="/receiver"
      logoutHref="/"
      headerRight={
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((p) => !p)}
            className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${notifOpen ? 'text-white/70' : 'text-white hover:text-white/70'}`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#da1a32] text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[#edf2f4] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#edf2f4] px-4 py-3">
                <h3 className="text-sm font-bold text-[#000000]">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-[#da1a32] hover:text-[#b01528]">
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
                      className={`border-b border-[#edf2f4] last:border-b-0 ${n.read ? '' : 'bg-[#edf2f4]/60'}`}
                    >
                      <div className="flex items-start gap-3 px-4 py-3">
                        <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.read ? 'bg-gray-300' : 'bg-[#da1a32]'}`} />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => setExpandedNotifId((cur) => (cur === n.id ? null : n.id))}
                            className="w-full rounded-lg p-1 text-left hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#da1a32]/40"
                          >
                            <p className={`text-xs font-medium ${n.read ? 'text-gray-600' : 'text-[#000000]'}`}>{n.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{n.desc}</p>
                            <p className="mt-1 text-[10px] text-gray-400">{n.time}</p>
                            <p className="mt-1 text-[10px] font-medium text-[#da1a32]">{expanded ? 'Hide details' : 'Show details'}</p>
                          </button>
                          {expanded ? (
                            <div className="mt-2 space-y-2 border-t border-[#edf2f4] pt-2">
                              <p className="text-xs leading-relaxed text-gray-600">{n.details}</p>
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
                          className="mt-0.5 flex-shrink-0 rounded-md p-1 text-gray-300 hover:bg-black/5 hover:text-gray-500"
                          aria-label="Dismiss notification"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {notifs.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-400">No notifications</p>
                )}
              </div>
            </div>
          )}
        </div>
      }
    >
      {children}
    </PortalSidebarLayout>
  );
}
