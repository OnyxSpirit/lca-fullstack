import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { apiDownload, apiRequest } from '../../services/apiClient';
import { ServerPagination } from '../../components/common/ServerPagination';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { partsCodeLabel } from '../../lib/userFacingLabels';
import { formatCurrency } from '../../lib/utils';
import { useUiStore } from '../../stores/uiStore';

type Filters={from:string;to:string;type:string;reference:string;designation:string;categoryId:string;destination:string;invoice:string;repairOrder:string;movementReference:string};
type InventoryPage={items:Array<any>;total:number;page:number;pageSize:number;totalPages:number;totals:{quantity_in:number;quantity_sold:number;quantity_delivered:number;quantity_consumed:number;quantity_returned:number;valuation_amount:number;commercial_amount:number;current_stock:number;stock_value:number}};
const empty:Filters={from:'',to:'',type:'',reference:'',designation:'',categoryId:'',destination:'',invoice:'',repairOrder:'',movementReference:''};
const movementOptions=[['purchase','Entrées'],['sale','Ventes directes'],['internal_delivery','Livraisons atelier'],['repair_order','Consommations OR'],['sav_return','Retours atelier'],['inventory','Inventaires'],['adjustment','Ajustements'],['transfer_in','Transferts entrants'],['transfer_out','Transferts sortants']];
const textFilters:Array<[keyof Filters,string]>=[['reference','Référence pièce'],['designation','Désignation'],['destination','Destination'],['invoice','Référence facture'],['repairOrder','Référence OR'],['movementReference','Référence mouvement']];

export function PartsInventoryPanel({agencyId}:{agencyId?:string}){
  const[page,setPage]=useState(1),[pageSize,setPageSize]=useState(20),[filters,setFilters]=useState<Filters>(empty),toast=useUiStore(state=>state.addToast);
  const params=useMemo(()=>parameters(agencyId,filters,{page:String(page),pageSize:String(pageSize)}),[agencyId,filters,page,pageSize]);
  const exportParams=useMemo(()=>parameters(agencyId,filters),[agencyId,filters]);
  const query=useQuery({queryKey:['parts-inventory',agencyId,page,pageSize,filters],queryFn:()=>apiRequest<InventoryPage>(`/parts-inventory?${params}`),enabled:Boolean(agencyId)});
  const references=useQuery({queryKey:['part-references',agencyId,'inventory'],queryFn:()=>apiRequest<{categories:Array<{id:string;name:string}>}>(`/part-references?agencyId=${encodeURIComponent(agencyId??'')}`),enabled:Boolean(agencyId)});
  const update=(key:keyof Filters,value:string)=>{setPage(1);setFilters(current=>({...current,[key]:value}))};
  async function download(format:'csv'|'xlsx'){try{const blob=await apiDownload(`/parts-inventory/export-filtered/${format}?${exportParams}`),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`inventaire-pieces.${format}`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(error){toast({type:'error',title:'Export impossible',description:error instanceof Error?error.message:'Erreur API'})}}
  const totals=query.data?.totals,field='rounded border p-2 text-xs';
  return <div className="space-y-4">
    <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
      <label className="text-xs">Du<input aria-label="Date de début" className={`${field} mt-1 w-full`} type="date" value={filters.from} onChange={event=>update('from',event.target.value)}/></label>
      <label className="text-xs">Au<input aria-label="Date de fin" className={`${field} mt-1 w-full`} type="date" value={filters.to} onChange={event=>update('to',event.target.value)}/></label>
      <select aria-label="Type de mouvement" className={field} value={filters.type} onChange={event=>update('type',event.target.value)}><option value="">Tous les mouvements</option>{movementOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="Catégorie" className={field} value={filters.categoryId} onChange={event=>update('categoryId',event.target.value)}><option value="">Toutes les catégories</option>{references.data?.categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
      {textFilters.map(([key,label])=><input key={key} aria-label={label} className={field} placeholder={label} value={filters[key]} onChange={event=>update(key,event.target.value)}/>)}
      <Button variant="outline" onClick={()=>{setPage(1);setFilters(empty)}}>Réinitialiser</Button>
      <Button variant="outline" icon={<Download className="h-4 w-4"/>} onClick={()=>void download('csv')}>Exporter CSV</Button>
      <Button variant="outline" icon={<Download className="h-4 w-4"/>} onClick={()=>void download('xlsx')}>Exporter Excel</Button>
    </div>
    {totals&&<div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">{[['Stock actuel',totals.current_stock],['Entrées',totals.quantity_in],['Ventes',totals.quantity_sold],['Livraisons atelier',totals.quantity_delivered],['Consommations',totals.quantity_consumed],['Retours',totals.quantity_returned],['Valeur du stock',formatCurrency(totals.stock_value)],['Valeur mouvements',formatCurrency(totals.valuation_amount)],['Montant commercial',formatCurrency(totals.commercial_amount)]].map(([label,value])=><Card key={String(label)}><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}</p></Card>)}</div>}
    {query.isError&&<p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{query.error instanceof Error?query.error.message:'Inventaire indisponible'}</p>}
    <Card padding="none"><div className="overflow-x-auto"><table className="min-w-[1250px] w-full text-xs"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Mouvement</th><th>Date</th><th>Pièce</th><th>Catégorie</th><th>Nature</th><th>Quantité</th><th>Stock avant</th><th>Stock après</th><th>Destination</th><th>Facture</th><th>OR</th><th>Valorisation</th><th>Montant commercial</th></tr></thead><tbody>{query.data?.items.map(item=><tr key={item.id} className="border-t"><td className="p-3 font-mono">MVT-PR-{item.id}</td><td>{item.moved_at}</td><td>{item.reference} — {item.part_name}</td><td>{item.category_name??'—'}</td><td>{partsCodeLabel(item.movement_type)}</td><td>{item.quantity}</td><td>{item.stock_before??'—'}</td><td>{item.stock_after??'—'}</td><td>{item.destination??'—'}</td><td>{item.invoice_number??'—'}</td><td>{item.order_number??'—'}</td><td>{formatCurrency(Number(item.valuation_amount))}</td><td>{item.commercial_amount==null?'—':formatCurrency(Number(item.commercial_amount))}</td></tr>)}{!query.isLoading&&!query.data?.items.length&&<tr><td colSpan={13} className="p-8 text-center text-slate-500">Aucun mouvement ne correspond aux filtres.</td></tr>}</tbody></table></div><ServerPagination page={page} pageSize={pageSize} total={query.data?.total??0} totalPages={query.data?.totalPages} loading={query.isFetching} label="mouvement(s)" onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1)}}/></Card>
  </div>
}

function parameters(agencyId:string|undefined,filters:Filters,extra:Record<string,string>={}){const value=new URLSearchParams({agencyId:agencyId??'',...extra});Object.entries(filters).forEach(([key,item])=>{if(item)value.set(key,item)});return value}
