import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient';
import { useAuthStore } from '../stores/authStore';

export const dashboardOverviewKey = ['dashboard','overview'] as const;

export interface DashboardComparison { current:number;previous:number;delta:number;deltaPercent:number|null }
export interface DashboardOverview {
  agencyId:string|null;
  permissions:{revenue:boolean;margin:boolean;sales:boolean;crm:boolean;vehicles:boolean;showroom:boolean;deliveries:boolean;workshop:boolean};
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

export const useDashboardOverviewQuery = () => {const auth=useAuthStore();return useQuery({
  queryKey:[...dashboardOverviewKey,auth.currentUser?.id,auth.currentAgency?.id],
  queryFn:()=>apiRequest<DashboardOverview>('/dashboard/overview'),
  enabled:Boolean(auth.currentUser?.id&&auth.currentAgency?.id&&auth.can('dashboard.view')),
  staleTime:60_000,
})};

export interface GlobalSearchResult {type:'customer'|'vehicle'|'lead'|'sale'|'invoice'|'repair_order'|'part';id:string;label:string;secondary:string;route:string}
export const useGlobalSearchQuery=(value:string,requestEnabled:boolean)=>{const auth=useAuthStore(),q=value.trim();return useQuery({queryKey:['global-search',auth.currentUser?.id,auth.currentAgency?.id,q],queryFn:({signal})=>apiRequest<GlobalSearchResult[]>(`/global-search?q=${encodeURIComponent(q)}`,{signal}),enabled:Boolean(requestEnabled&&q.length>=2&&auth.currentUser?.id&&auth.currentAgency?.id&&auth.can('dashboard.view')),staleTime:15_000})};

export const formatDeltaPercent = (value:number|null|undefined) => value == null || !Number.isFinite(value)
  ? '—'
  : `${value>0?'+':value<0?'−':''}${Math.abs(value).toLocaleString('fr-CG',{maximumFractionDigits:1})} %`;
