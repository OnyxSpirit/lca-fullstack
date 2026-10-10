import type{RbacScope,Role,RolePermission}from'../../api/userHooks';
export type RoleDraft={code:string;name:string;description:string;permissions:Record<string,RbacScope|null>};
export const roleDraftFromPersisted=(role?:Role):RoleDraft=>({code:role?.code??'',name:role?.name??'',description:role?.description??'',permissions:Object.fromEntries((role?.permissions??[]).map((permission:RolePermission)=>[String(permission.id),permission.scope??null]))});
export const roleAssignments=(draft:RoleDraft)=>Object.entries(draft.permissions).filter((entry):entry is [string,RbacScope]=>entry[1]!==null).map(([permissionId,scope])=>({permissionId,scope}));
