import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const tabClass = (active: boolean) =>
  `border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f1722] focus-visible:ring-offset-2 ${
    active
      ? 'border-[#8f1722] text-[#8f1722]'
      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
  }`;

export function SalesSectionTabs({ active }: { active: 'sales' | 'quotations' }) {
  const can = useAuthStore((state) => state.can);
  const tabs = [
    can('sales.view') ? { key: 'sales', label: 'Ventes', to: '/sales' } : null,
    can('quotations.view') ? { key: 'quotations', label: 'Devis', to: '/sales/quotations' } : null,
  ].filter((tab): tab is { key: 'sales' | 'quotations'; label: string; to: string } => Boolean(tab));

  return (
    <nav aria-label="Sections du module Ventes" className="overflow-x-auto border-b border-slate-200">
      <div role="tablist" aria-label="Ventes et devis" className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.to}
            role="tab"
            aria-selected={active === tab.key}
            aria-current={active === tab.key ? 'page' : undefined}
            className={tabClass(active === tab.key)}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
