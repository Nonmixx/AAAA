'use client';

import {
  Activity,
  Building2,
  MapPinned,
  Route,
  ShieldAlert,
  Warehouse,
} from 'lucide-react';
import {
  PortalSidebarLayout,
  type PortalSidebarItem,
} from './PortalSidebarLayout';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigation: PortalSidebarItem[] = [
    { name: 'Disasters', path: '/admin/disasters', icon: ShieldAlert },
    { name: 'Shelters', path: '/admin/shelters', icon: Building2 },
    { name: 'Collection Points', path: '/admin/collection-points', icon: Warehouse },
    { name: 'Routes', path: '/admin/routes', icon: Route },
    { name: 'Reporting', path: '/admin/reporting', icon: MapPinned },
    { name: 'Operations', path: '/admin/operations', icon: Activity },
  ];

  return (
    <PortalSidebarLayout
      portalLabel="Admin Operations"
      navigation={navigation}
      homeHref="/admin/disasters"
      logoutHref="/"
    >
      {children}
    </PortalSidebarLayout>
  );
}
