'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, LayoutDashboard, FileText, Building2, LogOut } from 'lucide-react';

export function CorporateAuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: 'Dashboard', path: '/corporate/dashboard', icon: LayoutDashboard },
    { name: 'Reports', path: '/corporate/reports', icon: FileText },
    { name: 'Profile', path: '/corporate/profile', icon: Building2 },
  ];

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-[#edf2f4] bg-opacity-30">
      <nav className="bg-[#000000] sticky top-0 z-50 shadow-lg border-b border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/corporate/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#da1a32] rounded-lg flex items-center justify-center shadow-sm">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <div>
                <div className="text-lg text-white font-bold">DonateAI</div>
                <div className="text-xs text-white opacity-70">Corporate ESG Portal</div>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                      active ? 'bg-[#da1a32] text-white font-medium' : 'text-white hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => router.push('/')}
                className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#ff8b99] hover:bg-[#1f1f1f] transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
