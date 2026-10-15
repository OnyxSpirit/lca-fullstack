import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { HttpError } from '../../shared/http-error.js';
import * as service from './two-factor-admin.service.js';

export const twoFactorAdminRouter=Router();
const id=(value:unknown)=>{const result=String(value??'');if(!/^[1-9]\d*$/.test(result))throw new HttpError(400,'Identifiant invalide.');return result};

twoFactorAdminRouter.get('/auth/2fa/users/:id',requirePermission('auth.2fa.users.view'),asyncHandler(async(req,res)=>res.json(await service.adminState(req,id(req.params.id)))));
twoFactorAdminRouter.patch('/auth/2fa/users/:id/requirement',requirePermission('auth.2fa.users.enforce'),asyncHandler(async(req,res)=>res.json(await service.enforceUser(req,id(req.params.id),req.body?.required,req.body?.totpCode,req.body?.currentPassword))));
twoFactorAdminRouter.post('/auth/2fa/users/:id/reset',requirePermission('auth.2fa.users.reset'),asyncHandler(async(req,res)=>res.json(await service.resetUser(req,id(req.params.id),req.body?.reason,req.body?.totpCode,req.body?.currentPassword))));
twoFactorAdminRouter.get('/auth/2fa/role-policies',requirePermission('auth.2fa.policy.manage'),asyncHandler(async(req,res)=>res.json(await service.rolePolicies(req))));
twoFactorAdminRouter.put('/auth/2fa/role-policies/:id',requirePermission('auth.2fa.policy.manage'),asyncHandler(async(req,res)=>res.json(await service.setRolePolicy(req,id(req.params.id),req.body?.required,req.body?.totpCode,req.body?.currentPassword))));
