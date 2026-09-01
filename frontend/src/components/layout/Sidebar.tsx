import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Grid,
  Users,
  Car,
  BadgePercent,
  Compass,
  Wrench,
  Calendar,
  Package,
  Truck,
  Receipt,
  BarChart3,
  FileText,
  Bell,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationsQuery } from '../../api/erpHooks';
import { useUiStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { ROUTES } from '../../navigation/routes';

export const Sidebar: React.FC = () => {
  const { currentUser, hasPermission } = useAuthStore();
  const notifications = useNotificationsQuery().data ?? [];
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useUiStore();

  const unreadNotifs = notifications.filter((notification) => !notification.isRead).length;

  interface NavSection {
    title: string;
    items: {
      to: string;
      label: string;
      icon: React.ReactNode;
      badge?: string | number;
      badgeVariant?: 'default' | 'danger' | 'warning' | 'primary' | 'success';
      module: string;
    }[];
  }

  const sections: NavSection[] = [
    {
      title: 'Centre de contrôle',
      items: [
        {
          to: ROUTES.dashboard,
          label: 'Dashboard Général',
          icon: <LayoutDashboard className="w-4 h-4" />,
          module: 'dashboard',
        },
        {
          to: ROUTES.modules,
          label: 'Portail des Modules',
          icon: <Grid className="w-4 h-4" />,
          module: 'modules',
        },
      ],
    },
    {
      title: 'Commercial & Ventes',
      items: [
        {
          to: ROUTES.crm,
          label: 'CRM & Prospects',
          icon: <Users className="w-4 h-4" />,
          badge: 8,
          badgeVariant: 'primary',
          module: 'crm',
        },
        {
          to: ROUTES.customers,
          label: 'Fiches Clients 360°',
          icon: <Users className="w-4 h-4" />,
          module: 'customers',
        },
        {
          to: ROUTES.vehicles,
          label: 'Stock Véhicules (VN/VO)',
          icon: <Car className="w-4 h-4" />,
          badge: 20,
          module: 'vehicles',
        },
        {
          to: ROUTES.sales,
          label: 'Ventes & Devis',
          icon: <BadgePercent className="w-4 h-4" />,
          module: 'sales',
        },
        {
          to: ROUTES.showroom,
          label: 'Showroom & Réception',
          icon: <Compass className="w-4 h-4" />,
          badge: 3,
          badgeVariant: 'warning',
          module: 'showroom',
        },
        {
          to: ROUTES.deliveries,
          label: 'Livraisons Véhicules',
          icon: <Truck className="w-4 h-4" />,
          badge: 2,
          badgeVariant: 'success',
          module: 'deliveries',
        },
      ],
    },
    {
      title: 'Après-Vente & Atelier',
      items: [
        {
          to: ROUTES.service,
          label: 'SAV & Ordres de Rép. (OR)',
          icon: <Wrench className="w-4 h-4" />,
          badge: 3,
          badgeVariant: 'primary',
          module: 'service',
        },
        {
          to: ROUTES.workshop,
          label: 'Planning Atelier & Ponts',
          icon: <Calendar className="w-4 h-4" />,
          module: 'workshop',
        },
        {
          to: ROUTES.parts,
          label: 'Pièces de Rechange (PR)',
          icon: <Package className="w-4 h-4" />,
          badge: '2 Alertes',
          badgeVariant: 'danger',
          module: 'parts',
        },
      ],
    },
    {
      title: 'Finance & Pilotage',
      items: [
        {
          to: ROUTES.billing,
          label: 'Facturation & Règl.',
          icon: <Receipt className="w-4 h-4" />,
          module: 'billing',
        },
        {
          to: ROUTES.reports,
          label: 'Reporting & BI',
          icon: <BarChart3 className="w-4 h-4" />,
          module: 'reports',
        },
        {
          to: ROUTES.documents,
          label: 'Documents & GED',
          icon: <FileText className="w-4 h-4" />,
          module: 'documents',
        },
      ],
    },
    {
      title: 'Système & Concession',
      items: [
        {
          to: ROUTES.notifications,
          label: 'Centre de Notifications',
          icon: <Bell className="w-4 h-4" />,
          badge: unreadNotifs > 0 ? unreadNotifs : undefined,
          badgeVariant: 'danger',
          module: 'notifications',
        },
        {
          to: ROUTES.users,
          label: 'Utilisateurs & RBAC',
          icon: <ShieldCheck className="w-4 h-4" />,
          module: 'users',
        },
        {
          to: ROUTES.settings,
          label: 'Paramètres Concession',
          icon: <Settings className="w-4 h-4" />,
          module: 'settings',
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-zinc-400 select-none">
      {/* Brand Header */}
      <div className="h-20 px-5 flex items-center justify-between border-b border-white/10">
        <NavLink
          to={ROUTES.dashboard}
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-3 group"
        >
         
         
          {sidebarCollapsed ? <div><div className="w-[100%]"><img alt='LCA Logo' src='https://congolaise-automobile.com/wp-content/uploads/2024/11/Design-sans-titre-54-1024x725.png'/></div></div> :<div className="w-[80%] p-5"><img alt='LCA Logo' src='https://congolaise-automobile.com/wp-content/uploads/2024/11/Design-sans-titre-54-1024x725.png'/></div>}
        </NavLink>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation items scrollable area */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 text-[13px] scrollbar-thin scrollbar-thumb-zinc-700">
        {sections.map((section, sIdx) => {
          // Filter items by RBAC permissions
          const visibleItems = section.items.filter((item) => hasPermission('view', item.module));
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className={sIdx > 0 ? 'pt-4 border-t border-white/8' : ''}>
              {!sidebarCollapsed && (
                <div className="px-3 mb-2 text-[9px] uppercase tracking-[0.18em] font-bold text-zinc-600">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 px-3 py-2 rounded-sm transition-colors cursor-pointer',
                        isActive
                          ? 'bg-[#8f1722] text-white font-semibold before:absolute before:-left-3 before:top-1 before:bottom-1 before:w-[3px] before:bg-white'
                          : 'text-zinc-400 hover:bg-white/7 hover:text-white',
                        sidebarCollapsed && 'justify-center px-2'
                      )
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!sidebarCollapsed && item.badge !== undefined && (
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                          item.badgeVariant === 'danger' && 'bg-red-500 text-white',
                          item.badgeVariant === 'warning' && 'bg-amber-500 text-white',
                          item.badgeVariant === 'success' && 'bg-emerald-500 text-white',
                          item.badgeVariant === 'primary' && 'bg-blue-500 text-white',
                          (!item.badgeVariant || item.badgeVariant === 'default') && 'bg-slate-800 text-slate-300'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Footer Profile & Collapse Toggle */}
      <div className="p-3 border-t border-white/10 bg-[#111113]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-[#8f1722]/20 border border-[#8f1722]/60 flex items-center justify-center text-[#d2767e] shrink-0 font-bold text-xs">
            {currentUser.name.charAt(0)}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{currentUser.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{currentUser.roleTitle}</div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer ml-auto shrink-0"
            title={sidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 transition-all duration-200 ease-in-out border-r border-slate-800 z-20',
          sidebarCollapsed ? 'w-18' : 'w-64'
        )}
      >
        <div className="fixed inset-y-0 left-0 z-20 flex flex-col transition-all duration-200 ease-in-out" style={{ width: sidebarCollapsed ? '4.5rem' : '16rem' }}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
