import type{ReactNode}from'react';
import{NavLink}from'react-router-dom';
import{BarChart3,BookOpenCheck,Landmark,Settings2,WalletCards}from'lucide-react';
import{useAuthStore}from'../../stores/authStore';

const links=[
 {to:'/treasury',label:"Vue d'ensemble",icon:BarChart3,end:true,permission:'treasury.view'},
 {to:'/treasury/operations',label:'Opérations',icon:WalletCards,permission:'treasury.view'},
 {to:'/treasury/commitments',label:'Engagements',icon:BookOpenCheck,permission:'treasury.coverage.view'},
 {to:'/treasury/reconciliation',label:'Rapprochement bancaire',icon:Landmark,permission:'treasury.reconciliation.view'},
 {to:'/treasury/accounting',label:'Comptabilité',icon:BookOpenCheck,permission:'accounting.chart.view'},
 {to:'/treasury/settings',label:'Paramétrage Treasury',icon:Settings2,permission:'treasury.view'},
];
export function TreasuryWorkspace({children}:{children:ReactNode}){const can=useAuthStore(s=>s.can);return <div className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><nav className="flex gap-1 overflow-x-auto" aria-label="Navigation Comptabilité et Trésorerie">{links.filter(x=>can(x.permission)).map(({to,label,icon:Icon,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive?'bg-[#8f1722] text-white shadow-sm':'text-slate-600 hover:bg-slate-100'}`}><Icon className="h-4 w-4"/>{label}</NavLink>)}</nav></div>{children}</div>}
