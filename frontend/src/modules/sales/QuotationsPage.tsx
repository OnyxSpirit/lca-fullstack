import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { QuotationsSection } from './QuotationsSection';
import { SalesSectionTabs } from './SalesSectionTabs';

export function QuotationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes & Propositions Commerciales"
        subtitle="Consultation des propositions et devis créés depuis le CRM."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Commercial' }, { label: 'Ventes', href: '/sales' }, { label: 'Devis' }]}
      />
      <SalesSectionTabs active="quotations" />
      <QuotationsSection />
    </div>
  );
}
