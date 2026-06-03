import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users as UsersIcon,
  UserPlus,
  Briefcase,
  BedDouble,
  Stethoscope,
  FlaskConical,
  Receipt,
  ClipboardCheck,
  FileText,
  BarChart3,
  Shield,
  Settings as SettingsIcon,
  Activity,
  X,
  type LucideIcon,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Omit = visible to everyone. "owner" always sees all. */
  roles?: Role[];
  /** Match only the exact path (used for the dashboard root). */
  end?: boolean;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true }],
  },
  {
    heading: 'Patients & Cases',
    items: [
      { label: 'Patients', to: '/patients', icon: UsersIcon },
      {
        label: 'New Patient',
        to: '/patients/create',
        icon: UserPlus,
        roles: ['booking', 'admin'],
      },
      { label: 'Cases', to: '/cases', icon: Briefcase },
      {
        label: 'New Case',
        to: '/cases/create',
        icon: UserPlus,
        roles: ['booking', 'admin'],
      },
    ],
  },
  {
    heading: 'Registers',
    items: [
      {
        label: 'Inpatient',
        to: '/inpatient',
        icon: BedDouble,
        roles: ['operations', 'admin'],
      },
      {
        label: 'Outpatient',
        to: '/outpatient',
        icon: Stethoscope,
        roles: ['operations', 'admin'],
      },
      {
        label: 'Laboratory',
        to: '/laboratory',
        icon: FlaskConical,
        roles: ['operations', 'admin'],
      },
    ],
  },
  {
    heading: 'Workflow',
    items: [
      { label: 'Billing', to: '/billing', icon: Receipt, roles: ['billing', 'admin'] },
      {
        label: 'Admin Review',
        to: '/admin-review',
        icon: ClipboardCheck,
        roles: ['admin'],
      },
      { label: 'Documents', to: '/documents', icon: FileText },
    ],
  },
  {
    heading: 'Insights & Admin',
    items: [
      { label: 'Reports', to: '/reports', icon: BarChart3 },
      { label: 'Users', to: '/users', icon: Shield, roles: ['admin'] },
      { label: 'Settings', to: '/settings', icon: SettingsIcon },
    ],
  },
];

function canView(role: Role | undefined, item: NavItem): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  if (role === 'owner') return true;
  return role !== undefined && item.roles.includes(role);
}

interface SidebarProps {
  /** Whether the mobile drawer is open. */
  open: boolean;
  /** Close handler for the mobile drawer. */
  onClose: () => void;
}

/**
 * Left navigation rail. Role-aware: items are filtered by the current user's
 * role (owner sees everything). On desktop it is a fixed column; on mobile it
 * slides in as a drawer controlled by `open`.
 */
export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const role = user?.role;

  const baseLink =
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const inactive = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  const active = 'bg-teal-50 text-teal-700';

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200',
          'lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-sky-500 text-white">
              <Activity className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Meridian</p>
              <p className="text-[11px] font-medium text-slate-400">Medical Assistance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {SECTIONS.map((section) => {
            const visible = section.items.filter((item) => canView(role, item));
            if (visible.length === 0) return null;
            return (
              <div key={section.heading}>
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.heading}
                </p>
                <ul className="space-y-1">
                  {visible.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `${baseLink} ${isActive ? active : inactive}`
                          }
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer / current user */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
              {(user?.name ?? '?').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-slate-900">
                {user?.name ?? 'Guest'}
              </p>
              <p className="truncate text-xs capitalize text-slate-400">
                {role ?? 'unauthenticated'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
