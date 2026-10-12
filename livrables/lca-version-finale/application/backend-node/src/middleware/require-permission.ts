import type { NextFunction, Request, Response } from 'express';
import { assertAnyPermission, assertPermission } from '../modules/rbac/rbac.service.js';

export const requirePermission=(permission:string)=>(request:Request,_response:Response,next:NextFunction)=>void assertPermission(request,permission).then(()=>next(),next);
export const requireAnyPermission=(permissions:string[])=>(request:Request,_response:Response,next:NextFunction)=>void assertAnyPermission(request,permissions).then(()=>next(),next);
