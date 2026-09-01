import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePartDetailQuery } from '../../api/erpHooks';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency } from '../../lib/utils';

export const SparePartDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const query=usePartDetailQuery(id);const part=query.data;
  if(query.isLoading)return <div className="p-8 text-sm text-slate-500">Chargement de la pièce…</div>;
  if (!part) return <Navigate to="/parts" replace />;

  return <div className="space-y-6"><PageHeader title={part.name} subtitle={`${part.reference} · OEM ${part.oemReference}`} breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Pièces', href: '/parts' }, { label: part.reference }]} actions={<Button size="sm" variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/parts')}>Retour</Button>} /><Card><div className="flex justify-between"><div><h2 className="font-bold text-lg">{part.name}</h2><p className="text-sm text-slate-500">{part.category} · {part.supplier}</p></div><StatusBadge status={part.status} type="part" /></div><dl className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-6 text-sm"><div><dt className="text-slate-500">Stock</dt><dd className="font-bold">{part.stockQuantity}</dd></div><div><dt className="text-slate-500">Emplacement</dt><dd className="font-mono">{part.locationBin}</dd></div><div><dt className="text-slate-500">Achat HT</dt><dd>{formatCurrency(part.purchasePriceHT)}</dd></div><div><dt className="text-slate-500">Vente HT</dt><dd>{formatCurrency(part.sellingPriceHT)}</dd></div></dl></Card></div>;
};
