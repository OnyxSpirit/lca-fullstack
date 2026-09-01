import React, { useState } from 'react';
import {
  Search,
  Bell,
  Building2,
  ChevronDown,
  Plus,
  LogOut,
  Settings,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationActions, useNotificationsQuery } from '../../api/erpHooks';
import { useUiStore } from '../../stores/uiStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { currentUser, currentAgency, allAgencies, setCurrentAgency, logout } = useAuthStore();
  const notifications = useNotificationsQuery().data ?? [];
  const { markAsRead } = useNotificationActions();
  const {
    setGlobalSearchOpen,
    setActiveQuickActionModal,
    setMobileMenuOpen,
  } = useUiStore();
  const navigate = useNavigate();

  const [agencyDropdownOpen, setAgencyDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const unread = notifications.filter((notification) => !notification.isRead).length;
  const recentNotifications = notifications.slice(0, 5);

  const todayFormatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-md border-b border-[#dedbd7] shrink-0">
      {/* Left side: Mobile burger + Concession Agency selector + Date */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -ml-2 text-slate-600 rounded-lg lg:hidden hover:bg-slate-100 cursor-pointer"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Agency Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setAgencyDropdownOpen(!agencyDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#242426] bg-[#f5f4f2] hover:bg-[#ece9e5] border border-[#dedbd7] rounded-md transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#8f1722] shrink-0" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{currentAgency.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {agencyDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setAgencyDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Changer de concession / Agence
                </div>
                {allAgencies.map((agency) => (
                  <button
                    key={agency.id}
                    onClick={() => {
                      setCurrentAgency(agency);
                      setAgencyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer ${
                      agency.id === currentAgency.id ? 'bg-blue-50/80 font-bold text-blue-700' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{agency.name}</div>
                      <div className="text-[10px] text-slate-400">{agency.address}</div>
                    </div>
                    {agency.isMain && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase">
                        Siège
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="text-xs text-slate-500 capitalize">{todayFormatted}</div>
        </div>
      </div>

      {/* Center: Global Search Trigger Button */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-zinc-400 bg-[#f5f4f2] hover:bg-[#ece9e5] border border-transparent hover:border-[#d5d1cc] rounded-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-slate-500 font-normal">Rechercher VIN, Client, Facture, OR...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-300 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side: Mobile search icon + Quick Action + Role badge + Notifications + User profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Search button */}
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden cursor-pointer"
          aria-label="Recherche"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Quick Action Button */}
        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setActiveQuickActionModal('menu')}
          className="hidden sm:inline-flex bg-[#8f1722] hover:bg-[#6f1019] text-white font-semibold text-xs rounded-md"
        >
          Action Rapide
        </Button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {unread}
              </div>
            )}
          </button>

          {notifDropdownOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setNotifDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-30 py-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Notifications</span>
                    {unread > 0 && <Badge variant="danger" size="sm">{unread} nouvelles</Badge>}
                  </div>
                  <Link
                    to="/notifications"
                    onClick={() => setNotifDropdownOpen(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Voir tout
                  </Link>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.linkRoute) {
                          navigate(notif.linkRoute);
                          setNotifDropdownOpen(false);
                        }
                      }}
                      className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                        !notif.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800">{notif.title}</span>
                        <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                      </div>
                      <p className="text-slate-600 leading-snug line-clamp-2">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-slate-200 transition-all cursor-pointer"
          >
            {currentUser.avatar ? <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
            /> : <span className="w-8 h-8 rounded-full bg-[#8f1722] text-white grid place-items-center text-xs font-bold" aria-label={currentUser.name}>{currentUser.name.charAt(0)}</span>}
            <div className="hidden xl:block text-left pr-1">
              <p className="text-xs font-semibold text-slate-900 leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{currentUser.roleTitle}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                  <div className="mt-1">
                    <Badge variant="primary" size="sm">{currentUser.roleTitle}</Badge>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    Paramètres concession
                  </Link>

                  <Link
                    to="/login"
                    onClick={() => { logout(); setUserMenuOpen(false); navigate('/login', { replace: true }); }}
                    className="px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium border-t border-slate-100 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion / Changer de compte
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
