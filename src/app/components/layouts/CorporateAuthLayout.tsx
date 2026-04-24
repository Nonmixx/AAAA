'use client';

import { LayoutDashboard, FileText, Building2 } from 'lucide-react';
import {
  PortalSidebarLayout,
  type PortalSidebarItem,
} from './PortalSidebarLayout';

export function CorporateAuthLayout({ children }: { children: React.ReactNode }) {
  const navigation: PortalSidebarItem[] = [
    { name: 'Dashboard', path: '/corporate/dashboard', icon: LayoutDashboard },
    { name: 'Reports', path: '/corporate/reports', icon: FileText },
    { name: 'Profile', path: '/corporate/profile', icon: Building2 },
  ];

  return (
    <PortalSidebarLayout
      portalLabel="Corporate ESG Portal"
      navigation={navigation}
      homeHref="/corporate/dashboard"
      logoutHref="/"
    >
      {children}
    </PortalSidebarLayout>
  );
}
