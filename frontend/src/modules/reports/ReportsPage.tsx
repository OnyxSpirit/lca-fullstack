import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Car,
  Wrench,
  Package,
  Calendar,
  Download,
  Filter,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useInvoicesQuery, useSalesQuery, useVehiclesQuery } from '../../api/erpHooks';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';

export const ReportsPage: React.FC = () => {
  const sales=useSalesQuery().data??[],vehicles=useVehiclesQuery().data??[],invoices=useInvoicesQuery().data??[];
  const { addToast } = useUiStore();

  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const revenue = invoices.reduce((sum, invoice) => sum + invoice.amountTTC, 0);
  const paidRevenue = invoices.reduce((sum, invoice) => sum + invoice.paidAmountTTC, 0);
  const deliveredSales = sales.filter(sale => sale.status === 'LIVRE');
  const exportCsv = () => { const rows=[['Facture','Client','Date','Montant TTC XAF','Payé XAF'],...invoices.map(i=>[i.invoiceNumber,i.customerName,i.issueDate,String(i.amountTTC),String(i.paidAmountTTC)])]; const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(';')).join('\n'); const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})); const anchor=document.createElement('a'); anchor.href=url; anchor.download=`rapport-lca-${new Date().toISOString().slice(0,10)}.csv`; anchor.click(); URL.revokeObjectURL(url); addToast({type:'success',title:'Rapport exporté',description:'Le fichier CSV contient les données actuellement lues du backend.'}); };

  const monthlySalesData=Array.from({length:6},(_,offset)=>{const d=new Date();d.setMonth(d.getMonth()-(5-offset));const key=d.toISOString().slice(0,7);const current=sales.filter(s=>String(s.contractDate).slice(0,7)===key);return{month:d.toLocaleDateString('fr-CG',{month:'short'}),vn:current.length,vo:0,ca:current.reduce((sum,s)=>sum+s.totalSaleTTC,0)}});

  const channelData=[{name:'Ventes véhicules',value:invoices.filter(i=>i.type==='FACTURE_VENTE_VN_VO').reduce((s,i)=>s+i.amountTTC,0),color:'#8f1722'},{name:'Atelier SAV',value:invoices.filter(i=>i.type==='FACTURE_ATELIER_SAV').reduce((s,i)=>s+i.amountTTC,0),color:'#171719'},{name:'Pièces',value:invoices.filter(i=>i.type==='FACTURE_PIECES').reduce((s,i)=>s+i.amountTTC,0),color:'#77716c'}];

  const salesRepPerformance=Object.values(sales.reduce((acc:Record<string,{name:string;deals:number;ca:number;margin:number;financingRate:number}>,sale)=>{const key=sale.salesRepId||'none';acc[key]??={name:sale.salesRepName||'Non affecté',deals:0,ca:0,margin:0,financingRate:0};acc[key].deals++;acc[key].ca+=sale.totalSaleTTC;acc[key].margin+=Math.max(0,sale.totalSaleTTC-sale.vehiclePriceTTC);return acc},{}));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableaux de Bord & Business Intelligence Concession"
        subtitle="Analyses financières, marges nettes, rotation des stocks et rentabilité des équipes."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Direction' }, { label: 'Rapports & BI' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
              {(['month', 'quarter', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all cursor-pointer ${
                    period === p ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p === 'month' ? 'Mensuel' : p === 'quarter' ? 'Trimestre' : 'Annuel'}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Top 4 Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">CA Consolidé Concession</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(revenue)}</div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3.5 h-3.5" /> +14.2% vs M-1
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Marge Brute Globale</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(paidRevenue)}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Taux moyen : 10.8%</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Volume VN / VO Livrés</span>
          <div className="text-2xl font-bold text-blue-700 mt-1">{deliveredSales.length} unités</div>
          <span className="text-[11px] text-slate-400 mt-1 block">35 VN • 42 VO</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Taux Financement F&I</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">76.4%</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">+4.1% vs objectif</span>
        </div>
      </div>

      {/* 2 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution VN vs VO */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Évolution Mensuelle des Volumes de Vente (VN vs VO)</CardTitle>
            <CardDescription>Nombre d'unités vendues par canal</CardDescription>
          </CardHeader>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${val} véh.`,
                    name === 'vn' ? 'Véhicules Neufs' : 'Véhicules Occasion',
                  ]}
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                />
                <Legend />
                <Bar dataKey="vn" name="Véhicules Neufs" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vo" name="Véhicules Occasion" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition du CA Concession</CardTitle>
            <CardDescription>Par activité métier</CardDescription>
          </CardHeader>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Part du CA']}
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 text-xs">
            {channelData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 truncate">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Commercial League Table */}
      <Card>
        <CardHeader>
          <CardTitle>Palmarès & Performance des Conseillers Commerciaux</CardTitle>
          <CardDescription>Volumes, chiffre d'affaires, marges générées et taux de financement</CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Conseiller Commercial</th>
                <th className="py-3 px-4">Dossiers Livrés</th>
                <th className="py-3 px-4">CA Ventes TTC</th>
                <th className="py-3 px-4">Marge Brute Générée</th>
                <th className="py-3 px-4">Pénétration Financement</th>
                <th className="py-3 px-4 text-right">Statut Objectif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesRepPerformance.map((rep, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <span className="font-bold text-slate-900">{rep.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">{rep.deals} véhicules</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{formatCurrency(rep.ca)}</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{formatCurrency(rep.margin)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{rep.financingRate}%</span>
                      <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${rep.financingRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant={rep.deals >= 12 ? 'success' : 'primary'} size="sm">
                      {rep.deals >= 12 ? 'Objectif Dépassé 🏆' : 'En Ligne'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
