export interface PageRequest { page:number; pageSize:number }
export interface PageMeta extends PageRequest { offset:number; totalPages:number }

const positiveInteger=(value:unknown,fallback:number)=>{
  const parsed=Number(value);
  return Number.isInteger(parsed)&&parsed>0?parsed:fallback;
};

export function pageRequest(query:Record<string,unknown>,defaultPageSize=7):PageRequest{
  return{page:positiveInteger(query.page,1),pageSize:Math.min(100,positiveInteger(query.pageSize,defaultPageSize))};
}

export function pageMeta(totalValue:unknown,request:PageRequest):PageMeta{
  const total=Math.max(0,Number(totalValue)||0),totalPages=Math.ceil(total/request.pageSize);
  const page=totalPages===0?1:Math.min(request.page,totalPages);
  return{...request,page,totalPages,offset:(page-1)*request.pageSize};
}

export function paged<T>(items:T[],totalValue:unknown,meta:PageMeta,extra:Record<string,unknown>={}){
  return{items,total:Math.max(0,Number(totalValue)||0),page:meta.page,pageSize:meta.pageSize,totalPages:meta.totalPages,...extra};
}
