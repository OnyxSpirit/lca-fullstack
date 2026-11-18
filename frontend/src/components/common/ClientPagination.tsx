import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ServerPagination, STANDARD_PAGE_SIZES } from "./ServerPagination";

export function ClientPagination<T>({items,render,pageSize:fixedPageSize,sizes=[...STANDARD_PAGE_SIZES],label="élément(s)"}:{items:T[];render:(visible:T[])=>ReactNode;pageSize?:number;sizes?:number[];label?:string}){
  const[page,setPage]=useState(1),[selectedSize,setSelectedSize]=useState(fixedPageSize??sizes[0]??10),pageSize=fixedPageSize??selectedSize,totalPages=Math.max(1,Math.ceil(items.length/pageSize));
  useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
  const visible=useMemo(()=>items.slice((page-1)*pageSize,page*pageSize),[items,page,pageSize]);
  return <>{render(visible)}<ServerPagination page={page} pageSize={pageSize} total={items.length} totalPages={totalPages} label={label} pageSizes={fixedPageSize?[fixedPageSize]:sizes} onPageChange={setPage} onPageSizeChange={size=>{setSelectedSize(size);setPage(1)}}/></>;
}

export function useClientPagination<T>(items:T[],fixedPageSize?:number,label="élément(s)"){
  const[page,setPage]=useState(1),[pageSize,setPageSize]=useState(fixedPageSize??10),totalPages=Math.max(1,Math.ceil(items.length/pageSize));
  useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
  const visible=useMemo(()=>items.slice((page-1)*pageSize,page*pageSize),[items,page,pageSize]);
  const controls=<ServerPagination page={page} pageSize={pageSize} total={items.length} totalPages={totalPages} label={label} pageSizes={fixedPageSize?[fixedPageSize]:STANDARD_PAGE_SIZES} onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1)}}/>;
  return{visible,controls,page,totalPages,setPage};
}
