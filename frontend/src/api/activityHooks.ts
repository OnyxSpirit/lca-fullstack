import{useQuery}from'@tanstack/react-query';
import{apiRequest}from'../services/apiClient';
export interface ActivityFilters{page:number;pageSize:number;userId?:string;agencyId?:string;concessionId?:string;module?:string;entityType?:string;category?:string;contextMode?:string;from?:string;to?:string;search?:string}
export interface ActivityPresentation{title:string;operationLabel:string;moduleLabel:string;sections:{title:string;fields:{label:string;value:string}[]}[];changes:{label:string;before:string;after:string}[]}
export interface ActivityItem{id:string;userId:string|null;actor:{name:string;isActive:boolean};module:string;entityType:string;entityId:string|null;resource:string;action:string;category:string;createdAt:string;context:{mode:string;agencyId:string|null;agencyName:string|null;concessionId:string|null;concessionName:string|null};detailsRestricted:boolean;oldValues:unknown;newValues:unknown;presentation:ActivityPresentation}
export interface ActivityResponse{rows:ActivityItem[];pagination:{page:number;pageSize:number;total:number;totalPages:number};scope:string}
export interface ActivityOptions{scope:string;categories:string[];contextModes:string[];users:{id:string;name:string;isActive:boolean}[];modules:{code:string;label:string}[];agencies:{id:string;name:string}[];concessions:{id:string;name:string}[]}
const params=(filters:ActivityFilters)=>{const value=new URLSearchParams();Object.entries(filters).forEach(([key,item])=>{if(item!==undefined&&item!=='')value.set(key,String(item))});return value};
export const useActivityQuery=(filters:ActivityFilters)=>useQuery({queryKey:['activity',filters],queryFn:()=>apiRequest<ActivityResponse>(`/activity?${params(filters)}`)});
export const useActivityOptionsQuery=()=>useQuery({queryKey:['activity','filters'],queryFn:()=>apiRequest<ActivityOptions>('/activity/filters')});
export const useActivityDetailQuery=(id:string|undefined)=>useQuery({queryKey:['activity','detail',id],queryFn:()=>apiRequest<ActivityItem>(`/activity/${id}`),enabled:Boolean(id)});
export const activityParams=params;
