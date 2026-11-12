import{useSearchParams}from'react-router-dom';
import{Tabs}from'../../components/ui/Tabs';
import{TreasuryPage,type TreasuryLegacyTab}from'./TreasuryPage';
import{TreasuryWorkspace}from'./TreasuryWorkspace';

const definitions={
 operations:[{id:'journal',label:'Journal financier'},{id:'accounts',label:'Transferts et comptes'}],
 commitments:[{id:'coverage',label:'Couverture et réservations'},{id:'budgets',label:'Budgets et engagements'}],
 settings:[{id:'accounts',label:'Comptes financiers'},{id:'categories',label:'Catégories'},{id:'flows',label:'Flux automatiques'}],
}as const;
export function TreasurySectionPage({section}:{section:keyof typeof definitions}){const[p,setP]=useSearchParams(),items=definitions[section],raw=p.get('view'),active=(items.some(x=>x.id===raw)?raw:items[0].id)as TreasuryLegacyTab;return <TreasuryWorkspace><Tabs tabs={items.map(x=>({id:x.id,label:x.label}))} activeTab={active} onChange={id=>{const next=new URLSearchParams(p);next.set('view',id);setP(next,{replace:false})}}/><TreasuryPage key={active} initialTab={active} hideTabs/></TreasuryWorkspace>}
export function TreasuryReconciliationPage(){return <TreasuryWorkspace><TreasuryPage initialTab="reconciliation" hideTabs/></TreasuryWorkspace>}
