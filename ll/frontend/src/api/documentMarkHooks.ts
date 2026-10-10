import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';
import{apiRequest}from'../services/apiClient';

export type MarkVersion={id:string;version:number;mimeType:string;fileSize:number;fileHash:string;isActive:boolean;createdAt?:string;revokedAt?:string|null};
export type ServiceStamp={id:string;name:string;agencyId:string|null;departmentId:string|null;documentContext:'DELIVERY_REPORT';isActive:boolean;activeVersion:MarkVersion|null};
const form=(file:File,values:Record<string,string>={})=>{const body=new FormData();body.append('file',file);for(const[key,value]of Object.entries(values))if(value)body.append(key,value);return body};

export const useMySignature=(allowed=true)=>useQuery({queryKey:['document-marks','signature','me'],queryFn:()=>apiRequest<MarkVersion[]>('/document-marks/signature/me'),enabled:allowed});
export const useSignatureActions=()=>{const qc=useQueryClient(),done=()=>qc.invalidateQueries({queryKey:['document-marks','signature','me']});return{
 upload:useMutation({mutationFn:(file:File)=>apiRequest('/document-marks/signature/me',{method:'POST',body:form(file)}),onSuccess:done}),
 revoke:useMutation({mutationFn:()=>apiRequest('/document-marks/signature/me',{method:'DELETE'}),onSuccess:done})
}};
export const useServiceStamps=(allowed=true)=>useQuery({queryKey:['document-marks','stamps'],queryFn:()=>apiRequest<ServiceStamp[]>('/document-marks/stamps'),enabled:allowed});
export const useStampActions=()=>{const qc=useQueryClient(),done=()=>qc.invalidateQueries({queryKey:['document-marks','stamps']});return{
 create:useMutation({mutationFn:({file,...values}:{file:File;name:string;agencyId?:string;departmentId?:string})=>apiRequest('/document-marks/stamps',{method:'POST',body:form(file,values)}),onSuccess:done}),
 replace:useMutation({mutationFn:({id,file}:{id:string;file:File})=>apiRequest(`/document-marks/stamps/${id}/version`,{method:'POST',body:form(file)}),onSuccess:done}),
 status:useMutation({mutationFn:({id,isActive}:{id:string;isActive:boolean})=>apiRequest(`/document-marks/stamps/${id}/status`,{method:'PATCH',body:JSON.stringify({isActive})}),onSuccess:done})
}};
