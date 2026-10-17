import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { HttpError } from '../../shared/http-error.js';
import * as service from './two-factor-admin.service.js';
import*as devices from'./trusted-device.service.js';

export const twoFactorAdminRouter=Router();
const id=(value:unknown)=>{const result=String(value??'');if(!/^[1-9]\d*$/.test(result))throw new HttpError(400,'Identifiant invalide.');return result};

twoFactorAdminRouter.get('/auth/2fa/users/:id',requirePermission('auth.2fa.users.view'),asyncHandler(async(req,res)=>res.json(await service.adminState(req,id(req.params.id)))));
twoFactorAdminRouter.patch('/auth/2fa/users/:id/requirement',requirePermission('auth.2fa.users.enforce'),asyncHandler(async(req,res)=>res.json(await service.enforceUser(req,id(req.params.id),req.body?.required))));
twoFactorAdminRouter.post('/auth/2fa/users/:id/reset',requirePermission('auth.2fa.users.reset'),asyncHandler(async(req,res)=>res.json(await service.resetUser(req,id(req.params.id),req.body?.reason))));
twoFactorAdminRouter.get('/auth/2fa/role-policies',requirePermission('auth.2fa.policy.manage'),asyncHandler(async(req,res)=>res.json(await service.rolePolicies(req))));
twoFactorAdminRouter.put('/auth/2fa/role-policies/:id',requirePermission('auth.2fa.policy.manage'),asyncHandler(async(req,res)=>res.json(await service.setRolePolicy(req,id(req.params.id),req.body?.required))));
twoFactorAdminRouter.get('/auth/2fa/security-settings',requirePermission('auth.2fa.settings.view'),asyncHandler(async(req,res)=>res.json(await service.securitySettings(req))));
twoFactorAdminRouter.put('/auth/2fa/security-settings',requirePermission('auth.2fa.settings.manage'),asyncHandler(async(req,res)=>res.json(await service.updateSecuritySettings(req,req.body))));
twoFactorAdminRouter.get('/auth/2fa/security-center/overview',asyncHandler(async(req,res)=>res.json(await service.overview(req))));
twoFactorAdminRouter.get('/auth/2fa/security-center/users',requirePermission('auth.2fa.users.view'),asyncHandler(async(req,res)=>res.json(await service.users(req,req.query))));
twoFactorAdminRouter.get('/auth/2fa/devices/me',requirePermission('auth.2fa.view'),asyncHandler(async(req,res)=>res.json(await devices.listTrustedDevices(req,req.query,true))));
twoFactorAdminRouter.delete('/auth/2fa/devices/me/current',requirePermission('auth.2fa.view'),asyncHandler(async(req,res)=>{const result=await devices.revokeCurrentTrustedDevice(req);res.cookie(devices.TRUSTED_DEVICE_COOKIE,'',devices.expiredTrustedDeviceCookieOptions());res.json(result)}));
twoFactorAdminRouter.delete('/auth/2fa/devices/me/:id',requirePermission('auth.2fa.view'),asyncHandler(async(req,res)=>{const result=await devices.revokeTrustedDevice(id(req.params.id),req,true,req.body?.reason);if(result.current)res.cookie(devices.TRUSTED_DEVICE_COOKIE,'',devices.expiredTrustedDeviceCookieOptions());res.json(result)}));
twoFactorAdminRouter.get('/auth/2fa/devices',requirePermission('auth.2fa.devices.view'),asyncHandler(async(req,res)=>res.json(await devices.listTrustedDevices(req,req.query))));
twoFactorAdminRouter.delete('/auth/2fa/devices/:id/permanent',requirePermission('auth.2fa.devices.delete'),asyncHandler(async(req,res)=>{const result=await devices.deleteRevokedTrustedDevice(id(req.params.id),req);if(result.current)res.cookie(devices.TRUSTED_DEVICE_COOKIE,'',devices.expiredTrustedDeviceCookieOptions());res.json({success:true})}));
twoFactorAdminRouter.delete('/auth/2fa/devices/:id',requirePermission('auth.2fa.devices.revoke'),asyncHandler(async(req,res)=>{const result=await devices.revokeTrustedDevice(id(req.params.id),req,false,req.body?.reason);if(result.current)res.cookie(devices.TRUSTED_DEVICE_COOKIE,'',devices.expiredTrustedDeviceCookieOptions());res.json(result)}));
