import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';import{apiRequest}from'../services/apiClient';
import{useUiStore}from'../stores/uiStore';
export type EntryLine={accountId:string;accountNumber?:string;accountLabel?:string;label:string;debit:string;credit:string};export type Entry={id:string;entryNumber:string|null;draftReference:string;label:string;accountingDate:string;status:string;version:number;journalCode:string;periodName:string;agencyName:string|null;totalDebit:number};
const invalidate=(qc:any)=>()=>qc.invalidateQueries({queryKey:['accounting','entries']});
const fail=(e:unknown)=>useUiStore.getState().addToast({type:'error',title:'Écriture comptable non enregistrée',description:e instanceof Error?e.message:'Erreur API'});
export const useEntries=(search:string,status:string)=>useQuery({queryKey:['accounting','entries',search,status],queryFn:()=>{const p=new URLSearchParams({pageSize:'50'});if(search)p.set('search',search);if(status)p.set('status',status);return apiRequest<{items:Entry[];summary:Record<string,number>;total:number}>(`/accounting/entries?${p}`)}});
export const useEntry=(id:string|null)=>useQuery({queryKey:['accounting','entries',id],queryFn:()=>apiRequest<any>(`/accounting/entries/${id}`),enabled:Boolean(id)});
export const useCreateEntry=()=>{const q=useQueryClient();return useMutation({mutationFn:(body:any)=>apiRequest('/accounting/entries',{method:'POST',body:JSON.stringify(body)}),onSuccess:invalidate(q),onError:fail})};
export const useEntryAction=(id:string|null,action:'validate'|'post'|'reverse')=>{const q=useQueryClient();return useMutation({mutationFn:(body:any={})=>apiRequest(`/accounting/entries/${id}/${action}`,{method:'POST',body:JSON.stringify(body)}),onSuccess:invalidate(q),onError:fail})};
