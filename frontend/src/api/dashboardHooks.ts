import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient';

export const dashboardOverviewKey = ['dashboard','overview'] as const;

export interface DashboardComparison { current:number;previous:number;delta:number;deltaPercent:number|null }
export interface DashboardOverview {
  agencyId:string|null;
  permissions:{revenue:boolean;sales:boolean;crm:boolean;vehicles:boolean;showroom:boolean;deliveries:boolean;workshop:boolean};
  revenue:DashboardComparison|null;
  grossMargin:DashboardComparison|null;
  sales:(DashboardComparison&{currentMonth:number;previousMonth:number})|null;
  crm:{activeLeads:number;scheduledTestDrivesThisWeek:number;deltaPercent:number|null}|null;
  vehicles:{total:number;available:number;reserved:number;sold:number;dormant:number;deltaPercent:number|null}|null;
  showroom:{todayVisitors:number;waiting:number;inProgress:number}|null;
  deliveries:{scheduled:number;inProgress:number}|null;
  workshop:{activeRepairOrders:number}|null;
  weeklyRevenue:(DashboardComparison&{peakDay:string|null})|null;
  weeklySeries:Array<{day:string;revenue:number}>;
  revenueTrend:Array<{month:string;vn:number;vo:number;sav:number}>;
  stockDistribution:Array<{name:string;value:number}>;
}

export const useDashboardOverviewQuery = (agencyId?:string) => useQuery({
  queryKey:[...dashboardOverviewKey,agencyId],
  queryFn:()=>apiRequest<DashboardOverview>(`/dashboard/overview${agencyId?`?agencyId=${encodeURIComponent(agencyId)}`:''}`),
  enabled:Boolean(localStorage.getItem('lca-access-token')),
  staleTime:60_000,
});

export const formatDeltaPercent = (value:number|null|undefined) => value == null || !Number.isFinite(value)
  ? '—'
  : `${value>0?'+':value<0?'−':''}${Math.abs(value).toLocaleString('fr-CG',{maximumFractionDigits:1})} %`;
