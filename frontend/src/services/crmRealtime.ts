export interface CrmRealtimeHint {customerChanged?:boolean}

export function createCrmRefreshScheduler(refresh:(customerChanged:boolean)=>void,delay=75){
  let timer:ReturnType<typeof setTimeout>|null=null;
  let customerChanged=false;
  const receive=(payload:CrmRealtimeHint={})=>{
    customerChanged=customerChanged||Boolean(payload.customerChanged);
    if(timer)return;
    timer=setTimeout(()=>{timer=null;const refreshCustomers=customerChanged;customerChanged=false;refresh(refreshCustomers)},delay);
  };
  const dispose=()=>{if(timer)clearTimeout(timer);timer=null;customerChanged=false};
  return{receive,dispose};
}
