export interface AuthUser { sub: string; email: string; roles: string[]; agencyId: string | null }
export interface RequestRbacContext { roleId:string|null; roleCode:string|null; isSuperAdmin:boolean; permissions:Map<string,'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL'|null> }
