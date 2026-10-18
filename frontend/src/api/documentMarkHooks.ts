import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';
import{apiRequest}from'../services/apiClient';

export type MarkVersion={id:string;version:number;mimeType:string;fileSize:number;fileHash:string;isActive:boolean;createdAt?:string;revokedAt?:string|null};
export type ServiceStamp={id:string;name:string;concessionId:string;agencyId:string|null;departmentId:string|null;categoryId:string|null;documentContext:string;documentContexts:string[];isActive:boolean;revokedAt:string|null;revokedBy:string|null;revocationReason:string|null;activeVersion:MarkVersion|null};
export type StampCategory={id:string;name:string;description:string|null;is_active:boolean;is_used:boolean};
export type DocumentMarkType={code:string;label:string;triggerStatus:string;policyManaged:boolean;stampSupported:boolean};
export type DocumentMarkPolicy={id:string;document_type:string;agency_id:string|null;signature_required:boolean;stamp_required:boolean;missing_mark_behavior:'BLOCK'|'ALLOW_WITHOUT_MARK';default_stamp_id:string|null;default_stamp_name:string|null;is_active:boolean};
export type RoleStamp={id:string;name:string;document_context:string;document_contexts:string[];category_name:string|null;is_active:boolean;authorized:boolean};
const form=(file:File,values:Record<string,string>={})=>{const body=new FormData();body.append('file',file);for(const[key,value]of Object.entries(values))if(value)body.append(key,value);return body};

export const useMySignature=(allowed=true)=>useQuery({queryKey:['document-marks','signature','me'],queryFn:()=>apiRequest<MarkVersion[]>('/document-marks/signature/me'),enabled:allowed});
export const useSignatureActions=()=>{const qc=useQueryClient(),done=()=>qc.invalidateQueries({queryKey:['document-marks','signature','me']});return{
 upload:useMutation({mutationFn:(file:File)=>apiRequest('/document-marks/signature/me',{method:'POST',body:form(file)}),onSuccess:done}),
 revoke:useMutation({mutationFn:()=>apiRequest('/document-marks/signature/me',{method:'DELETE'}),onSuccess:done})
}};
export const useServiceStamps=(allowed=true)=>useQuery({queryKey:['document-marks','stamps'],queryFn:()=>apiRequest<ServiceStamp[]>('/document-marks/stamps'),enabled:allowed});
export const useStampCategories=(allowed=true)=>useQuery({queryKey:['document-marks','categories'],queryFn:()=>apiRequest<StampCategory[]>('/document-marks/categories'),enabled:allowed});
export const useDocumentMarkTypes=(allowed=true)=>useQuery({queryKey:['document-marks','types'],queryFn:()=>apiRequest<DocumentMarkType[]>('/document-marks/types'),enabled:allowed});
export const useDocumentMarkPolicies=(allowed=true)=>useQuery({queryKey:['document-marks','policies'],queryFn:()=>apiRequest<DocumentMarkPolicy[]>('/document-marks/policies'),enabled:allowed});
export const useRoleStamps=(roleId:string|number|undefined,allowed=true)=>useQuery({queryKey:['document-marks','role-stamps',String(roleId??'')],queryFn:()=>apiRequest<RoleStamp[]>(`/roles/${roleId}/stamps`),enabled:Boolean(roleId)&&allowed});
export const useSaveRoleStamps=()=>{const qc=useQueryClient();return useMutation({mutationFn:({roleId,stampIds}:{roleId:string|number;stampIds:string[]})=>apiRequest(`/roles/${roleId}/stamps`,{method:'PUT',body:JSON.stringify({stampIds})}),onSuccess:(_,v)=>void qc.invalidateQueries({queryKey:['document-marks','role-stamps',String(v.roleId)]})})};
export const useStampActions=()=>{const qc=useQueryClient(),done=()=>qc.invalidateQueries({queryKey:['document-marks','stamps']});return{
 create:useMutation({mutationFn:({file,documentContexts,...values}:{file:File;name:string;agencyId?:string;departmentId?:string;categoryId?:string;documentContexts:string[]})=>apiRequest('/document-marks/stamps',{method:'POST',body:form(file,{...values,documentContexts:JSON.stringify(documentContexts)})}),onSuccess:done}),
 replace:useMutation({mutationFn:({id,file}:{id:string;file:File})=>apiRequest(`/document-marks/stamps/${id}/version`,{method:'POST',body:form(file)}),onSuccess:done}),
 documents:useMutation({mutationFn:({id,documentContexts}:{id:string;documentContexts:string[]})=>apiRequest(`/document-marks/stamps/${id}/document-types`,{method:'PATCH',body:JSON.stringify({documentContexts})}),onSuccess:done}),
 status:useMutation({mutationFn:({id,isActive}:{id:string;isActive:boolean})=>apiRequest(`/document-marks/stamps/${id}/status`,{method:'PATCH',body:JSON.stringify({isActive})}),onSuccess:done}),
 revoke:useMutation({mutationFn:({id,reason}:{id:string;reason:string})=>apiRequest(`/document-marks/stamps/${id}/revoke`,{method:'POST',body:JSON.stringify({reason})}),onSuccess:done}),
 remove:useMutation({mutationFn:(id:string)=>apiRequest(`/document-marks/stamps/${id}`,{method:'DELETE'}),onSuccess:done})
}};
export const useDocumentMarkAdministration=()=>{const qc=useQueryClient(),refresh=()=>qc.invalidateQueries({queryKey:['document-marks']});return{
 createCategory:useMutation({mutationFn:(body:{name:string;description?:string})=>apiRequest('/document-marks/categories',{method:'POST',body:JSON.stringify(body)}),onSuccess:refresh}),
 updateCategory:useMutation({mutationFn:({id,...body}:{id:string;name:string;description?:string;isActive:boolean})=>apiRequest(`/document-marks/categories/${id}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:refresh}),
 savePolicy:useMutation({mutationFn:({documentType,...body}:{documentType:string;signatureRequired:boolean;stampRequired:boolean;missingMarkBehavior:string;defaultStampId?:string;isActive:boolean})=>apiRequest(`/document-marks/policies/${documentType}`,{method:'PUT',body:JSON.stringify(body)}),onSuccess:refresh})
}};
