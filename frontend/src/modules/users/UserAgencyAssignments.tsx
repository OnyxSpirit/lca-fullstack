import React from'react';
import{Building2}from'lucide-react';
import{useUserAgenciesQuery,useUserAgencyActions,type Role}from'../../api/userHooks';
import{Badge}from'../../components/ui/Badge';
import{useUiStore}from'../../stores/uiStore';

type Agency={id:string;name:string;isActive:boolean};

export const UserAgencyAssignments=({userId,agencies,roles,canAssignAgency,canAssignRole}:{userId:string;agencies:Agency[];roles:Role[];canAssignAgency:boolean;canAssignRole:boolean})=>{
 const query=useUserAgenciesQuery(userId),actions=useUserAgencyActions(userId),toast=useUiStore(s=>s.addToast);
 const run=async(work:()=>Promise<unknown>,title:string)=>{try{await work();toast({type:'success',title})}catch(error){toast({type:'error',title:'Affectation impossible',description:error instanceof Error?error.message:'Erreur API'})}};
 const byAgency=new Map(query.data?.map(assignment=>[assignment.agencyId,assignment]));
 const businessRoles=roles.filter(role=>!role.is_system&&role.is_active!==false);
 return <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-start gap-3"><Building2 className="mt-0.5 h-5 w-5 text-[#8f1722]"/><div><h3 className="text-sm font-bold">Agences d’affectation</h3><p className="text-xs text-slate-500">Cochez les agences accessibles et les rôles propres à chacune. Toute suppression est appliquée uniquement après une action explicite.</p></div></div>
  {query.isLoading?<p className="py-4 text-xs text-slate-500">Chargement des affectations…</p>:<div className="mt-4 space-y-2">{agencies.map(agency=>{const assignment=byAgency.get(agency.id),active=assignment?.status==='ACTIVE',unavailable=!agency.isActive&&!assignment;return <div key={agency.id} className={`rounded-md border bg-white p-3 ${active?'border-[#8f1722]/40':'border-slate-200'}`}><div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={active} disabled={!canAssignAgency||Boolean(assignment?.isPrimary)||unavailable} onChange={event=>{if(assignment)void run(()=>actions.status.mutateAsync({assignmentId:assignment.id,isActive:event.target.checked}),event.target.checked?'Agence réactivée':'Agence retirée');else if(event.target.checked)void run(()=>actions.add.mutateAsync(agency.id),'Agence affectée')}}/>{agency.name}</label><div className="flex gap-1">{assignment?.isPrimary&&<Badge size="sm">Principale</Badge>}{!agency.isActive&&<Badge size="sm" variant="warning">Agence inactive</Badge>}{assignment&&<Badge size="sm" variant={active?'success':'default'}>{active?'Affectation active':'Affectation retirée'}</Badge>}</div></div>
    {active&&<fieldset className="mt-3 border-t pt-3"><legend className="px-1 text-[11px] font-bold text-slate-500">Rôles dans cette agence</legend><div className="mt-1 grid gap-2 sm:grid-cols-2">{businessRoles.map(role=>{const checked=assignment.roles.some(current=>String(current.id)===String(role.id));return <label key={role.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={checked} disabled={!canAssignRole} onChange={event=>void run(()=>event.target.checked?actions.addRole.mutateAsync({assignmentId:assignment.id,roleId:String(role.id)}):actions.removeRole.mutateAsync({assignmentId:assignment.id,roleId:String(role.id)}),event.target.checked?'Rôle attribué':'Rôle retiré')}/>{role.name}</label>})}</div>{!assignment.roles.length&&<p className="mt-2 text-[11px] text-amber-700">Aucun rôle métier dans cette agence.</p>}</fieldset>}
   </div>})}</div>}
 </section>;
};
