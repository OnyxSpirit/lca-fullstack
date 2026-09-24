import { refreshRealtimeToken } from './realtime';
import { clearSessionClientState } from './sessionIsolation';

const API_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const ACCESS_TOKEN_KEY='lca-access-token';
const REFRESH_TOKEN_KEY='lca-refresh-token';
const AUTH_USER_KEY='lca-auth-user';
export const API_ORIGIN = API_URL.startsWith('http') ? API_URL.replace(/\/api\/?$/, '') : '';
export const assetUrl = (value?: string | null) => value ? (/^https?:\/\//.test(value) ? value : `${API_ORIGIN}${value}`) : '';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

type SessionSnapshot={generation:number;accessToken:string|null;refreshToken:string|null};
type RefreshFlight={snapshot:SessionSnapshot;promise:Promise<string>};
let sessionGeneration=0;
let refreshFlight:RefreshFlight|null=null;

/** Invalidate every request belonging to the previous login/user/agency context. */
export function markAuthSessionBoundary(){sessionGeneration+=1;}

const snapshotSession=():SessionSnapshot=>({generation:sessionGeneration,accessToken:localStorage.getItem(ACCESS_TOKEN_KEY),refreshToken:localStorage.getItem(REFRESH_TOKEN_KEY)});
const sameSession=(snapshot:SessionSnapshot)=>snapshot.generation===sessionGeneration&&snapshot.accessToken===localStorage.getItem(ACCESS_TOKEN_KEY)&&snapshot.refreshToken===localStorage.getItem(REFRESH_TOKEN_KEY);
const abortError=()=>new DOMException('La requête a été annulée','AbortError');

async function send(path:string,init:RequestInit,token:string|null){
  const headers=new Headers(init.headers);
  if(!(init.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  if(token)headers.set('Authorization',`Bearer ${token}`);else headers.delete('Authorization');
  return fetch(`${API_URL}${path}`,{...init,headers});
}

function terminateSession(snapshot:SessionSnapshot){
  if(!sameSession(snapshot))return;
  markAuthSessionBoundary();
  clearSessionClientState();
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event('lca:session-expired'));
}

async function performRefresh(snapshot:SessionSnapshot){
  const response=await send('/auth/refresh',{method:'POST',body:JSON.stringify({refreshToken:snapshot.refreshToken})},null);
  if(!response.ok){
    if(response.status===401||response.status===403)terminateSession(snapshot);
    const payload=await response.json().catch(()=>null) as{message?:string}|null;
    throw new ApiError(response.status,payload?.message??'Rafraîchissement de session impossible');
  }
  const refreshed=await response.json() as{accessToken:string;refreshToken:string};
  if(!sameSession(snapshot))throw new ApiError(401,'La session a changé pendant le rafraîchissement');
  localStorage.setItem(ACCESS_TOKEN_KEY,refreshed.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY,refreshed.refreshToken);
  refreshRealtimeToken(refreshed.accessToken);
  return refreshed.accessToken;
}

function refreshSingleFlight(snapshot:SessionSnapshot){
  if(refreshFlight&&refreshFlight.snapshot.generation===snapshot.generation&&refreshFlight.snapshot.accessToken===snapshot.accessToken&&refreshFlight.snapshot.refreshToken===snapshot.refreshToken)return refreshFlight.promise;
  const flight:RefreshFlight={snapshot,promise:Promise.resolve('')};
  flight.promise=performRefresh(snapshot).finally(()=>{if(refreshFlight===flight)refreshFlight=null});
  refreshFlight=flight;
  return flight.promise;
}

async function sendWithRefresh(path:string,init:RequestInit){
  const snapshot=snapshotSession();
  let response=await send(path,init,snapshot.accessToken);
  if(response.status!==401||!snapshot.refreshToken||path.startsWith('/auth/'))return{response,responseToken:snapshot.accessToken,snapshot};
  if(!sameSession(snapshot))throw new ApiError(401,'La session a changé pendant la requête');
  const refreshedToken=await refreshSingleFlight(snapshot);
  if(init.signal?.aborted)throw abortError();
  if(snapshot.generation!==sessionGeneration)throw new ApiError(401,'La session a changé pendant la requête');
  response=await send(path,init,refreshedToken);
  return{response,responseToken:refreshedToken,snapshot};
}

export async function apiRequest<T>(path:string,init:RequestInit={}):Promise<T>{
  const{response,responseToken,snapshot}=await sendWithRefresh(path,init);
  if(snapshot.generation!==sessionGeneration||(responseToken&&localStorage.getItem(ACCESS_TOKEN_KEY)!==responseToken))throw new ApiError(401,'La session a changé pendant la requête');
  if(!response.ok){const payload=await response.json().catch(()=>({message:response.statusText}));throw new ApiError(response.status,payload.message??'Erreur API');}
  if(response.status===204)return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiDownload(path:string,init:RequestInit={}):Promise<Blob>{
  const{response,responseToken,snapshot}=await sendWithRefresh(path,init);
  if(snapshot.generation!==sessionGeneration||(responseToken&&localStorage.getItem(ACCESS_TOKEN_KEY)!==responseToken))throw new ApiError(401,'La session a changé pendant le téléchargement');
  if(!response.ok){const payload=await response.json().catch(()=>null)as{message?:string}|null;throw new ApiError(response.status,payload?.message??'Téléchargement impossible');}
  return response.blob();
}
