'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Settings, LayoutDashboard, Sparkles, Search, MapPin, User, Zap, X } from 'lucide-react';
import { useDonorContext } from '../../context/DonorContext';
import {
  PortalSidebarLayout,
  type PortalSidebarItem,
} from './PortalSidebarLayout';
import {
  fetchDonorNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/supabase/notifications';

interface Notification {
  id: string;
  title: string;
  desc: string;
  details: string;
  time: string;
  read: boolean;
  type: 'allocation' | 'delivery' | 'proof' | 'emergency';
}

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
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
      'Courier reference CR-8821-A. Pickup Apr 21, 09:00-12:00 from your saved address. Bring donation ID DON-002; driver may request a quick photo at handoff.',
    time: '1 hr ago',
    read: false,
    type: 'delivery',
  },
  {
    id: '3',
    title: 'Proof of Delivery Available',
    desc: 'DON-001 Food Packs - proof uploaded by Hope Orphanage',
    details:
      'Signed handoff sheet and warehouse photo are attached to this donation. Download from Tracking -> DON-001 -> Documents. If anything looks wrong, open a dispute within 7 days.',
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
    title: 'Emergency Mode Activated',
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

function mapNotificationRow(row: NotificationRow): Notification {
  const typeMap: Record<string, Notification['type']> = {
    allocationCompleted: 'allocation',
    deliveryScheduled: 'delivery',
    itemDelivered: 'delivery',
    emergencyAlerts: 'emergency',
  };

  return {
    id: row.id,
    title: row.title,
    desc: row.body ?? '',
    details: row.body ?? '',
    time: new Date(row.created_at).toLocaleString(),
    read: row.is_read,
    type: typeMap[row.type] ?? 'allocation',
  };
}

export function DonorAuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { emergencyMode } = useDonorContext();
  const [notifOpen, setNotifOpen] = useState(false);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const rows = await fetchDonorNotifications(20);
        if (rows.length > 0) {
          setNotifs(rows.map(mapNotificationRow));
        } else {
          setNotifs([]);
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    void loadNotifications();
  }, []);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const navigation: PortalSidebarItem[] = [
    { name: 'Dashboard', path: '/donor/dashboard', icon: LayoutDashboard },
    { name: 'AI Donate', path: '/donor/donate', icon: Sparkles },
    { name: 'Browse Needs', path: '/donor/needs', icon: Search },
    { name: 'Track', path: '/donor/tracking', icon: MapPin },
    { name: 'Profile', path: '/donor/profile', icon: User },
    { name: 'Settings', path: '/donor/settings', icon: Settings },
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

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const dismissNotif = (id: string) => {
    setExpandedNotifId((cur) => (cur === id ? null : cur));
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <PortalSidebarLayout
      portalLabel="Donor Portal"
      navigation={navigation}
      homeHref="/donor/dashboard"
      logoutHref="/donor"
      headerRight={
        <>
          {emergencyMode && (
            <div className="hidden items-center gap-2 rounded-full border border-[#da1a32]/40 bg-[#da1a32]/10 px-3 py-1.5 text-xs font-medium text-[#ffb3bd] md:flex">
              <Zap className="h-4 w-4" />
              Emergency Mode
            </div>
          )}

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
                <div className="max-h-80 overflow-y-auto">
                  {notifs.map((n) => {
                    const expanded = expandedNotifId === n.id;
                    return (
                      <div
                        key={n.id}
                        className={`border-b border-[#edf2f4] last:border-b-0 transition-colors ${n.read ? '' : 'bg-[#edf2f4]/50'}`}
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
                                <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${NOTIF_COLORS[n.type]}`}>
                                  {n.type === 'allocation'
                                    ? 'Allocation'
                                    : n.type === 'delivery'
                                      ? 'Delivery'
                                      : n.type === 'proof'
                                        ? 'Proof'
                                        : 'System'}
                                </span>
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
        </>
      }
    >
      {children}
    </PortalSidebarLayout>
  );
}
