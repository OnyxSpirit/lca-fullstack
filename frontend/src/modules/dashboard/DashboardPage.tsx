import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Car,
  Users,
  Wrench,
  Truck,
  AlertTriangle,
  Receipt,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useDeliveriesQuery, useRepairOrdersQuery } from '../../api/erpHooks';
import { useNotificationActions, useNotificationsQuery } from '../../api/notificationHooks';
import { useUiStore } from '../../stores/uiStore';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { formatDeltaPercent, useDashboardOverviewQuery } from '../../api/dashboardHooks';

export const DashboardPage: React.FC = () => {
  const { currentUser, currentAgency } = useAuthStore();
  const repairOrders=useRepairOrdersQuery().data??[],deliveries=useDeliveriesQuery().data??[];
  const overviewQuery=useDashboardOverviewQuery(currentAgency?.id),overview=overviewQuery.data;
  const notificationsQuery=useNotificationsQuery({page:1,pageSize:4}),notifications=notificationsQuery.data?.items??[],notificationActions=useNotificationActions();
  const { setActiveQuickActionModal } = useUiStore();
  const navigate = useNavigate();

  const loadingValue=overviewQuery.isLoading?'…':'—';
  const weeklyMax=Math.max(0,...(overview?.weeklySeries.map(item=>item.revenue)??[]));
  const weeklyData=(overview?.weeklySeries??[]).map(item=>({day:new Intl.DateTimeFormat('fr-CG',{weekday:'short',timeZone:'UTC'}).format(new Date(`${item.day}T00:00:00Z`)).slice(0,3).toUpperCase(),ca:item.revenue,height:`${weeklyMax?Math.max(4,item.revenue/weeklyMax*100):4}%`}));
  const revenueTrendData=(overview?.revenueTrend??[]).map(item=>({...item,month:new Intl.DateTimeFormat('fr-CG',{month:'short',timeZone:'UTC'}).format(new Date(`${item.month}-01T00:00:00Z`))}));

  return (
    <div className="space-y-6">
      {/* High Density Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#d5d1cc]">
        <div>
          <div className="text-[10px] font-black tracking-[0.22em] uppercase text-[#8f1722] mb-2">Pilotage concession</div>
          <div className="flex items-center gap-2">
            <h2 className="text-[30px] font-bold text-[#111113] tracking-[-0.035em]">Tableau de bord</h2>
            <span className="text-[10px] px-2 py-1 rounded-sm bg-white text-[#8f1722] font-bold uppercase tracking-wider border border-[#d7b0b4]">
              {currentAgency.name}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Bonjour {currentUser.name.split(' ')[0]}, voici l'activité opérationnelle de votre concession aujourd'hui.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveQuickActionModal('sale')}
            className="bg-[#8f1722] hover:bg-[#6f1019] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer"
          >
            Nouvelle Vente
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="bg-white border border-[#cbc7c2] text-[#242426] px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#eeece9] transition-colors cursor-pointer"
          >
            Exporter Rapport
          </button>
        </div>
      </div>

      {/* 4 High Density Primary Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* Metric 1: CA */}
        <div
          onClick={() => navigate('/billing')}
          className="bg-[#151517] text-white p-5 rounded-md border border-black cursor-pointer hover:bg-black transition-all"
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.14em]">
              Chiffre d'Affaires
            </span>
            <span className="text-emerald-500 text-xs font-bold">{formatDeltaPercent(overview?.revenue?.deltaPercent)}</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {overview?.revenue?formatCurrency(overview.revenue.current):loadingValue}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Marge réelle : {overview?.grossMargin?formatCurrency(overview.grossMargin.current):loadingValue}</div>
        </div>

        {/* Metric 2: Ventes du Mois */}
        <div
          onClick={() => navigate('/sales')}
          className="bg-white p-5 rounded-md border border-[#dedbd7] cursor-pointer hover:border-[#8f1722] transition-all"
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ventes du Mois
            </span>
            <span className={(overview?.sales?.delta??0) >= 0 ? 'text-emerald-600 text-xs font-bold' : 'text-red-600 text-xs font-bold'}>
              {overview?.sales?`${overview.sales.delta>0?'+':''}${overview.sales.delta} vs mois précédent`:'—'}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{overview?.sales?`${overview.sales.currentMonth} véhicule${overview.sales.currentMonth>1?'s':''}`:loadingValue}</div>
          <div className="text-xs text-slate-400 mt-1">Dossiers non annulés enregistrés ce mois</div>
        </div>

        {/* Metric 3: Prospects Actifs */}
        <div
          onClick={() => navigate('/crm')}
          className="bg-white p-5 rounded-md border border-[#dedbd7] cursor-pointer hover:border-[#8f1722] transition-all"
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Prospects Actifs
            </span>
            <span className="text-amber-500 text-xs font-bold">{formatDeltaPercent(overview?.crm?.deltaPercent)}</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{overview?.crm?.activeLeads??loadingValue}</div>
          <div className="text-xs text-slate-400 mt-1">{overview?.crm?`${overview.crm.scheduledTestDrivesThisWeek} essais prévus cette semaine`:loadingValue}</div>
        </div>

        {/* Metric 4: Stock Disponible */}
        <div
          onClick={() => navigate('/vehicles')}
          className="bg-white p-5 rounded-md border border-[#dedbd7] cursor-pointer hover:border-[#8f1722] transition-all"
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stock Disponible
            </span>
            <span className="text-slate-500 text-xs font-bold">{formatDeltaPercent(overview?.vehicles?.deltaPercent)}</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {overview?.vehicles?`${overview.vehicles.available} véhicules`:loadingValue}
          </div>
          <div className="text-xs text-slate-400 mt-1">{overview?.vehicles?`${overview.vehicles.dormant} âgés de > 60 jours`:loadingValue}</div>
        </div>
      </div>

      {/* Main Section: Chart & Weekly Evolution + Dark Alert Panel & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Weekly & Monthly Charts (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly CA Evolution Chart Card */}
          <div className="bg-white border border-[#dedbd7] rounded-md flex flex-col p-5">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Évolution du CA Hebdomadaire</h3>
                <p className="text-xs text-slate-400">Performances journalières VN/VO & SAV</p>
              </div>
              <span className="text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded-md px-2.5 py-1 font-medium">
                Semaine en cours
              </span>
            </div>

            <div className="h-44 flex items-end gap-3 pb-2 border-b border-slate-100">
              {weeklyData.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                    {formatCurrency(item.ca)}
                  </div>
                  <div
                    className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-95"
                    style={{
                      height: item.height,
                      backgroundColor:
                        idx === 2
                          ? '#8f1722'
                          : idx === 4
                          ? '#a51d2a'
                          : idx === 3
                          ? '#bc5962'
                          : idx === 1
                          ? '#d39a9f'
                          : idx === 0
                          ? '#e5c5c8'
                          : '#dedbd7',
                    }}
                  />
                  <span className="text-[10px] font-bold text-slate-400">{item.day}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
              <span>Pic d'activité : <strong>{overview?.weeklyRevenue?.peakDay?new Intl.DateTimeFormat('fr-CG',{weekday:'long',timeZone:'UTC'}).format(new Date(`${overview.weeklyRevenue.peakDay}T00:00:00Z`)):'Aucune activité'}</strong></span>
              <span className="text-emerald-600 font-semibold">{formatDeltaPercent(overview?.weeklyRevenue?.deltaPercent)} vs semaine précédente</span>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Chiffre d'Affaires par Activité</CardTitle>
                <CardDescription>VN (Neuf), VO (Occasion) et SAV Atelier</CardDescription>
              </div>
              <Badge variant="primary" size="sm">6 derniers mois</Badge>
            </CardHeader>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}kXAF`}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="vn" name="Véhicules Neufs (VN)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vo" name="Véhicules Occasion (VO)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sav" name="Atelier SAV & Pièces" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column: Signature High Density Dark Alert Box & Quick Actions */}
        <div className="space-y-6 flex flex-col">
          {/* Signature High Density Dark Critical Alerts Card */}
          <div className="bg-slate-900 text-white rounded-xl p-5 flex-1 flex flex-col shadow-md border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Alertes Critiques
              </h3>
              <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-bold border border-red-500/30">
                {notificationsQuery.data?.unreadCount??0} non lues
              </span>
            </div>

            <div className="space-y-3.5 flex-1 overflow-y-auto">
              {notifications.map(notification=><div key={notification.id} onClick={()=>{const go=()=>navigate(notification.linkRoute);if(notification.isRead)go();else void notificationActions.markAsRead.mutateAsync(notification.id).then(go).catch(error=>useUiStore.getState().addToast({type:'error',title:'Notification non mise à jour',description:error instanceof Error?error.message:'Erreur API'}))}} className="flex gap-3 items-start border-l-2 border-[#8f1722] pl-3 py-1 cursor-pointer hover:bg-slate-800/50 rounded-r transition-colors"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white">{notification.subject}</p><p className="text-[11px] text-slate-400 truncate">{notification.message}</p></div></div>)}
              {!notifications.length&&<p className="text-xs text-slate-400">Aucune alerte enregistrée.</p>}
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800">
              <button
                onClick={() => navigate('/notifications')}
                className="w-full py-1.5 text-center text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
              >
                Voir toutes les notifications →
              </button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shrink-0 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Actions Rapides
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setActiveQuickActionModal('lead')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 transition-colors cursor-pointer text-center"
              >
                + Prospect
              </button>
              <button
                onClick={() => setActiveQuickActionModal('repairOrder')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 transition-colors cursor-pointer text-center"
              >
                + RDV SAV
              </button>
              <button
                onClick={() => navigate('/service')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 transition-colors cursor-pointer text-center"
              >
                Fiche OR
              </button>
              <button
                onClick={() => navigate('/deliveries')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 transition-colors cursor-pointer text-center"
              >
                Imprimer BL
              </button>
              <button
                onClick={() => setActiveQuickActionModal('vehicle')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 transition-colors cursor-pointer text-center"
              >
                + Véhicule
              </button>
              <button
                onClick={() => setActiveQuickActionModal('invoice')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 transition-colors cursor-pointer text-center"
              >
                + Facture
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Widgets Grid (2 columns: Live Repair Orders & Upcoming Deliveries) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Repair Orders (SAV Atelier) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              <div>
                <CardTitle>Ordres de Réparation en cours (Atelier)</CardTitle>
                <CardDescription>Véhicules actuellement sur les ponts</CardDescription>
              </div>
            </div>
            <Link to="/service" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
              Planning complet →
            </Link>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {repairOrders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/service/repair-orders/${order.id}`)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{order.orNumber}</span>
                    <span className="text-xs font-semibold text-slate-700">{order.vehicleModel}</span>
                    <span className="text-[11px] font-mono text-slate-400">({order.vehiclePlate})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Client: {order.customerName} • {order.bayNumber} • Tech: {order.technicianName}
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={order.status} type="or" />
                  <div className="text-[10px] text-slate-400 mt-1">{order.promisedCompletionDate}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Hot Leads & Active Deliveries */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <div>
                <CardTitle>Livraisons & Mises en Main Prévues</CardTitle>
                <CardDescription>Véhicules vendus prêts pour la remise client</CardDescription>
              </div>
            </div>
            <Link to="/deliveries" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
              Calendrier →
            </Link>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {deliveries.slice(0, 4).map((del) => (
              <div
                key={del.id}
                onClick={() => navigate(`/deliveries/${del.id}`)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{del.deliveryNumber}</span>
                    <span className="text-xs font-semibold text-slate-800">{del.vehicleLabel}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Client: {del.customerName} • Conseiller: {del.salesRepName}
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={del.status} type="delivery" />
                  <div className="text-[11px] font-bold text-slate-700 mt-1">
                    {del.deliveryDate} ({del.deliveryTimeSlot})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
