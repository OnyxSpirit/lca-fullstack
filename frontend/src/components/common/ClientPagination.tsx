import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "../ui/Button";

export function ClientPagination<T>({items,render,pageSize:fixedPageSize,sizes=[10,25,50],label="élément(s)"}:{items:T[];render:(visible:T[])=>ReactNode;pageSize?:number;sizes?:number[];label?:string}){
  const[page,setPage]=useState(1),[selectedSize,setSelectedSize]=useState(fixedPageSize??sizes[0]??10),pageSize=fixedPageSize??selectedSize,totalPages=Math.max(1,Math.ceil(items.length/pageSize));
  useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
  const visible=useMemo(()=>items.slice((page-1)*pageSize,page*pageSize),[items,page,pageSize]);
  return <>{render(visible)}<div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs"><span>{items.length} {label} · page {page}/{totalPages}</span><div className="flex items-center gap-2">{!fixedPageSize&&<select aria-label="Taille de page" className="rounded border border-slate-300 px-2 py-1" value={selectedSize} onChange={e=>{setSelectedSize(Number(e.target.value));setPage(1)}}>{sizes.map(size=><option key={size} value={size}>{size}</option>)}</select>}<Button size="xs" variant="outline" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Précédent</Button><Button size="xs" variant="outline" disabled={page>=totalPages} onClick={()=>setPage(value=>value+1)}>Suivant</Button></div></div></>;
}

export function useClientPagination<T>(items:T[],fixedPageSize?:number,label="élément(s)"){
  const[page,setPage]=useState(1),[pageSize,setPageSize]=useState(fixedPageSize??10),totalPages=Math.max(1,Math.ceil(items.length/pageSize));
  useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
  const visible=useMemo(()=>items.slice((page-1)*pageSize,page*pageSize),[items,page,pageSize]);
  const controls=<div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs"><span>{items.length} {label} · page {page}/{totalPages}</span><div className="flex items-center gap-2">{!fixedPageSize&&<select aria-label="Taille de page" className="rounded border border-slate-300 px-2 py-1" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}>{[10,25,50].map(size=><option key={size} value={size}>{size}</option>)}</select>}<Button size="xs" variant="outline" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Précédent</Button><Button size="xs" variant="outline" disabled={page>=totalPages} onClick={()=>setPage(value=>value+1)}>Suivant</Button></div></div>;
  return{visible,controls,page,totalPages,setPage};
}
