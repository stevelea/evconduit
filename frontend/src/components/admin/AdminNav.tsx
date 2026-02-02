'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Car,
  Settings,
  Webhook,
  ScrollText,
  CreditCard,
  Newspaper,
  Bell,
  Database,
} from 'lucide-react';

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/user-updates', label: 'Updates', icon: Bell },
  { href: '/admin/backups', label: 'Backups', icon: Database },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-100 border-b border-gray-200 px-4 py-2 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {adminLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
